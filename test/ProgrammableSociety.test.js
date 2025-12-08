const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Programmable Society Protocol", function () {
  let psoc, owner, teacher, ta, student, stranger;
  
  // Mock IPFS Hashes
  const DEFAULT_GRAY_HASH = "QmDefaultGrayHash";
  const TEACHER_HASH = "QmTeacherUniqueHash";
  const STUDENT_GOLD_HASH = "QmStudentGoldHash";

  beforeEach(async function () {
    [owner, teacher, ta, student, stranger] = await ethers.getSigners();
    
    // Deploy contract with a default gray badge hash
    const Factory = await ethers.getContractFactory("ProgrammableSociety");
    psoc = await Factory.deploy(DEFAULT_GRAY_HASH);
    await psoc.waitForDeployment();
  });

  describe("Deployment & Setup", function () {
    it("Should set the correct default hash", async function () {
      expect(await psoc.defaultStudentHash()).to.equal(DEFAULT_GRAY_HASH);
    });

    it("Should support EIP-5192 interface", async function () {
      expect(await psoc.supportsInterface("0xb45a3c0e")).to.be.true;
    });
  });

  describe("Step 1: Faculty Management (Owner Only)", function () {
    it("Should allow Owner to add Teacher/TA", async function () {
      await psoc.addFaculty(
        [teacher.address, ta.address], 
        [TEACHER_HASH, "QmTAHash"], 
        [2, 1] // 2=Teacher, 1=TA
      );

      // Check Teacher (Token ID 1)
      expect(await psoc.ownerOf(1)).to.equal(teacher.address);
      const profile = await psoc.profiles(1);
      expect(profile.role).to.equal(2);
      expect(await psoc.tokenURI(1)).to.equal(`ipfs://${TEACHER_HASH}`);
    });

    it("Should revert if non-owner tries to add Faculty", async function () {
      await expect(
        psoc.connect(stranger).addFaculty([stranger.address], ["Hash"], [2])
      ).to.be.revertedWithCustomError(psoc, "OwnableUnauthorizedAccount");
    });
  });

  describe("Step 2: Student Enrollment (Faculty Only)", function () {
    beforeEach(async function () {
      // Setup: Owner adds Teacher and TA
      await psoc.addFaculty(
        [teacher.address, ta.address], 
        [TEACHER_HASH, "QmTAHash"], 
        [2, 1]
      );
    });

    it("Should allow Teacher to enroll students", async function () {
      // Teacher enrolls student
      await psoc.connect(teacher).enrollStudents([student.address]);

      // Check Student (Token ID 3) - 1:Teacher, 2:TA, 3:Student
      expect(await psoc.ownerOf(3)).to.equal(student.address);
      expect(await psoc.tokenURI(3)).to.equal(`ipfs://${DEFAULT_GRAY_HASH}`);
    });

    it("Should allow TA to enroll students (Branch Coverage)", async function () {
      // This test ensures the OR condition (Teacher || TA) is fully covered
      await psoc.connect(ta).enrollStudents([stranger.address]);
      expect(await psoc.ownerOf(3)).to.equal(stranger.address);
    });

    it("Should prevent Strangers from enrolling students", async function () {
      await expect(
        psoc.connect(stranger).enrollStudents([student.address])
      ).to.be.revertedWith("Caller does not hold a badge");
    });
  });

  describe("Step 3: Certification (Faculty Only)", function () {
    beforeEach(async function () {
      // Setup: Teacher enrolls Student
      await psoc.addFaculty([teacher.address], [TEACHER_HASH], [2]);
      await psoc.connect(teacher).enrollStudents([student.address]);
    });

    it("Should allow Teacher to certify student (Dynamic URI Change)", async function () {
      // Token ID 1 = Teacher, Token ID 2 = Student
      
      // Action: Teacher certifies Student
      await expect(psoc.connect(teacher).certifyStudent(2, "A+", STUDENT_GOLD_HASH))
        .to.emit(psoc, "StudentCertified")
        .withArgs(2, "A+", teacher.address);

      // Check URI updated to Gold Hash
      expect(await psoc.tokenURI(2)).to.equal(`ipfs://${STUDENT_GOLD_HASH}`);
    });

    it("Should prevent Students from certifying themselves", async function () {
      await expect(
        psoc.connect(student).certifyStudent(2, "A", "HackHash")
      ).to.be.revertedWith("Caller is not Faculty");
    });
  });

  describe("SBT Logic & Lifecycle", function () {
    beforeEach(async function () {
      await psoc.addFaculty([teacher.address], [TEACHER_HASH], [2]);
      await psoc.connect(teacher).enrollStudents([student.address]);
    });

    it("Should prevent Transfers", async function () {
      await expect(
        psoc.connect(student).transferFrom(student.address, stranger.address, 2)
      ).to.be.revertedWith("SBT: Transfer not allowed");
    });

    it("Should return true for locked() view function", async function () {
      const isLocked = await psoc.locked(2);
      expect(isLocked).to.be.true;
    });

    it("Should allow Student to burn their own badge (Self-destruct)", async function () {
      await psoc.connect(student).burn(2);
      await expect(psoc.ownerOf(2)).to.be.revertedWithCustomError(psoc, "ERC721NonexistentToken");
    });

    it("Should allow Faculty to revoke a badge", async function () {
      await psoc.connect(teacher).revoke(2);
      await expect(psoc.ownerOf(2)).to.be.revertedWithCustomError(psoc, "ERC721NonexistentToken");
    });

    it("Should prevent Strangers from burning others' badges", async function () {
      await expect(
        psoc.connect(stranger).burn(2)
      ).to.be.revertedWith("You do not own this badge");
    });
  });
});