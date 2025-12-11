const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Programmable Society Protocol (100% Coverage)", function () {
  let psoc;
  let owner, teacher, ta, studentA, studentB, stranger;

  // Mock Data
  const DEFAULT_GRAY_HASH = "QmGrayHash";
  const GOLD_FOLDER_HASH = "QmGoldFolder";
  const NEW_GOLD_FOLDER_HASH = "QmNewFolder";
  
  const TEACHER_HASH = "QmTeacherHash";
  const TA_HASH = "QmTAHash";
  
  const ROLE_STUDENT = 0;
  const ROLE_TA = 1;
  const ROLE_TEACHER = 2;

  // Error Messages (从合约中提取，用于断言)
  const ERR_NOT_OWNER = "Ownable: caller is not the owner"; // 或者自定义 error
  const ERR_NOT_FACULTY = "Caller is not Faculty";
  const ERR_NO_BADGE = "Caller does not hold a badge";
  const ERR_LENGTH_MISMATCH = "Input length mismatch";
  const ERR_MUST_BE_FACULTY = "Role must be Faculty";
  const ERR_NOT_STUDENT = "Target is not a Student";
  const ERR_ALREADY_CERTIFIED = "Student already certified";
  const ERR_SBT_TRANSFER = "SBT: Transfer not allowed";
  const ERR_NOT_OWNER_OF_TOKEN = "You do not own this badge";

  beforeEach(async function () {
    [owner, teacher, ta, studentA, studentB, stranger] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("ProgrammableSociety");
    psoc = await Factory.deploy(DEFAULT_GRAY_HASH, GOLD_FOLDER_HASH);
    await psoc.waitForDeployment();
  });

  describe("1. Deployment & Config", function () {
    it("Should set correct initial state variables", async function () {
      expect(await psoc.name()).to.equal("Programmable-Society");
      expect(await psoc.symbol()).to.equal("PSOC");
      expect(await psoc.defaultStudentHash()).to.equal(DEFAULT_GRAY_HASH);
      expect(await psoc.studentGoldFolderHash()).to.equal(GOLD_FOLDER_HASH);
    });

    it("Should allow Owner to update Gold Folder Hash", async function () {
      await expect(psoc.setStudentGoldFolderHash(NEW_GOLD_FOLDER_HASH))
        .to.emit(psoc, "BatchMetadataUpdate")
        .withArgs(1, 1); // _nextTokenId is 1 initially
      
      expect(await psoc.studentGoldFolderHash()).to.equal(NEW_GOLD_FOLDER_HASH);
    });

    it("Should revert if non-owner tries to update config", async function () {
      await expect(psoc.connect(stranger).setStudentGoldFolderHash(NEW_GOLD_FOLDER_HASH))
        .to.be.revertedWithCustomError(psoc, "OwnableUnauthorizedAccount");
    });
  });

  describe("2. Faculty Management (Logic A)", function () {
    it("Should allow Owner to add Faculty (Teacher & TA)", async function () {
      const tx = await psoc.addFaculty(
        [teacher.address, ta.address],
        [TEACHER_HASH, TA_HASH],
        [ROLE_TEACHER, ROLE_TA]
      );
      
      // Token ID 1 = Teacher, Token ID 2 = TA
      expect(await psoc.ownerOf(1)).to.equal(teacher.address);
      expect(await psoc.ownerOf(2)).to.equal(ta.address);
      
      // Check Events
      await expect(tx).to.emit(psoc, "Locked").withArgs(1);
      
      // Check Union Field Usage: 'data' should store Hash
      const p1 = await psoc.profiles(1);
      expect(p1.role).to.equal(ROLE_TEACHER);
      expect(p1.data).to.equal(TEACHER_HASH);
      expect(p1.isCertified).to.equal(true);

      // Check URI Logic A
      expect(await psoc.tokenURI(1)).to.equal(`ipfs://${TEACHER_HASH}`);
    });

    it("Should revert on array length mismatch", async function () {
      await expect(psoc.addFaculty(
        [teacher.address], 
        [TEACHER_HASH, TA_HASH], // Mismatch
        [ROLE_TEACHER]
      )).to.be.revertedWith(ERR_LENGTH_MISMATCH);
    });

    it("Should revert if trying to add Student via addFaculty", async function () {
      await expect(psoc.addFaculty(
        [studentA.address],
        ["SomeHash"],
        [ROLE_STUDENT] // Invalid role for this function
      )).to.be.revertedWith(ERR_MUST_BE_FACULTY);
    });
  });

  describe("3. Student Enrollment (Logic B - Enrolled)", function () {
    beforeEach(async function () {
      await psoc.addFaculty([teacher.address], [TEACHER_HASH], [ROLE_TEACHER]);
    });

    it("Should allow Faculty to enroll students", async function () {
      // Teacher enrolls Student A
      const tx = await psoc.connect(teacher).enrollStudents([studentA.address]);
      
      // Token ID 2 = Student A (since ID 1 is Teacher)
      expect(await psoc.ownerOf(2)).to.equal(studentA.address);
      
      // Check Union Field Usage: 'data' should be empty (no grade yet)
      const p = await psoc.profiles(2);
      expect(p.role).to.equal(ROLE_STUDENT);
      expect(p.data).to.equal(""); 
      expect(p.internalId).to.equal(0);
      expect(p.isCertified).to.equal(false);

      // Check URI Logic B (Enrolled)
      expect(await psoc.tokenURI(2)).to.equal(`ipfs://${DEFAULT_GRAY_HASH}`);
    });

    it("Should revert if Stranger tries to enroll", async function () {
      await expect(psoc.connect(stranger).enrollStudents([studentA.address]))
        .to.be.revertedWith(ERR_NO_BADGE);
    });

    it("Should revert if Student tries to enroll others", async function () {
      // First enroll studentA
      await psoc.connect(teacher).enrollStudents([studentA.address]);
      // StudentA tries to call enroll
      await expect(psoc.connect(studentA).enrollStudents([studentB.address]))
        .to.be.revertedWith(ERR_NOT_FACULTY);
    });
  });

  describe("4. Certification & Union Field (Logic B - Certified)", function () {
    beforeEach(async function () {
      await psoc.addFaculty([teacher.address], [TEACHER_HASH], [ROLE_TEACHER]);
      await psoc.connect(teacher).enrollStudents([studentA.address, studentB.address]);
      // State: Teacher=1, StudentA=2, StudentB=3
    });

    it("Should allow Faculty to certify a student", async function () {
      const GRADE = "Distinction";
      
      // Certify Student A (ID 2)
      // This is the FIRST certification, so internalId should become 1
      const tx = await psoc.connect(teacher).certifyStudent(2, GRADE);
      
      await expect(tx)
        .to.emit(psoc, "StudentCertified")
        .withArgs(2, GRADE, teacher.address);

      // Check State Update
      const p = await psoc.profiles(2);
      expect(p.isCertified).to.equal(true);
      expect(p.internalId).to.equal(1);
      // 🔥 Check Union Field: 'data' now stores Grade
      expect(p.data).to.equal(GRADE);

      // Check URI Logic B (Certified)
      // Should satisfy: ipfs:// + FolderHash + / + internalId + .json
      expect(await psoc.tokenURI(2)).to.equal(`ipfs://${GOLD_FOLDER_HASH}/1.json`);
    });

    it("Should increment internalId correctly for subsequent certifications", async function () {
      // Certify A -> internalId 1
      await psoc.connect(teacher).certifyStudent(2, "A");
      
      // Certify B -> internalId 2
      await psoc.connect(teacher).certifyStudent(3, "B");
      
      expect(await psoc.tokenURI(3)).to.equal(`ipfs://${GOLD_FOLDER_HASH}/2.json`);
    });

    it("Should revert if target is not a Student (e.g., trying to certify a Teacher)", async function () {
      await expect(psoc.connect(teacher).certifyStudent(1, "A"))
        .to.be.revertedWith(ERR_NOT_STUDENT);
    });

    it("Should revert if student is already certified", async function () {
      await psoc.connect(teacher).certifyStudent(2, "A");
      await expect(psoc.connect(teacher).certifyStudent(2, "B"))
        .to.be.revertedWith(ERR_ALREADY_CERTIFIED);
    });
  });

  describe("5. Soulbound & Lifecycle Logic", function () {
    beforeEach(async function () {
      await psoc.addFaculty([teacher.address], [TEACHER_HASH], [ROLE_TEACHER]);
      await psoc.connect(teacher).enrollStudents([studentA.address]);
      // State: Teacher=1, StudentA=2
    });

    it("Should revert on Transfer attempt (SBT)", async function () {
      await expect(
        psoc.connect(studentA).transferFrom(studentA.address, stranger.address, 2)
      ).to.be.revertedWith(ERR_SBT_TRANSFER);
    });

    it("Should allow Student to Burn their own badge", async function () {
      await psoc.connect(studentA).burn(2);
      
      // Verify token is gone
      await expect(psoc.ownerOf(2))
        .to.be.revertedWithCustomError(psoc, "ERC721NonexistentToken");
      
      // Verify mapping is cleared
      expect(await psoc.userTokenId(studentA.address)).to.equal(0);
    });

    it("Should revert if trying to Burn someone else's badge", async function () {
      await expect(psoc.connect(stranger).burn(2))
        .to.be.revertedWith(ERR_NOT_OWNER_OF_TOKEN);
    });

    it("Should allow Faculty to Revoke a badge", async function () {
      await psoc.connect(teacher).revoke(2);
      
      await expect(psoc.ownerOf(2))
        .to.be.revertedWithCustomError(psoc, "ERC721NonexistentToken");
    });

    it("Should revert if Non-Faculty tries to Revoke", async function () {
      await expect(psoc.connect(stranger).revoke(2))
        .to.be.revertedWith(ERR_NO_BADGE); // Modifier check fails first
        
      await expect(psoc.connect(studentA).revoke(2)) // Student tries to revoke self via revoke function
        .to.be.revertedWith(ERR_NOT_FACULTY);
    });
  });

  describe("6. Interface & Compliance", function () {
    beforeEach(async function () {
      await psoc.addFaculty([teacher.address], [TEACHER_HASH], [ROLE_TEACHER]);
    });

    it("Should return true for locked() (EIP-5192)", async function () {
      // Must own the token to check locked status
      expect(await psoc.locked(1)).to.equal(true);
    });
    
    it("Should revert locked() check for nonexistent token", async function () {
      await expect(psoc.locked(999))
        .to.be.revertedWithCustomError(psoc, "ERC721NonexistentToken");
    });

    it("Should support EIP-5192 Interface ID", async function () {
      // 0xb45a3c0e is EIP-5192
      expect(await psoc.supportsInterface("0xb45a3c0e")).to.equal(true);
      // 0x80ac58cd is ERC-721
      expect(await psoc.supportsInterface("0x80ac58cd")).to.equal(true);
    });
  });
});