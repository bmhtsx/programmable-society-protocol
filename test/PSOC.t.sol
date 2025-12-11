// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/ProgrammableSociety.sol";

/**
 * @title PSOC Fuzzing Suite
 * @notice Property-based testing to verify invariants and permission boundaries.
 * @dev Run with: `forge test`
 */
contract PSOCTest is Test {
    ProgrammableSociety psoc;

    // --- Actors ---
    address owner;
    address teacher;
    address ta;

    // --- Mock Data ---
    string constant DEFAULT_GRAY_HASH = "QmGrayBadgeHash";
    string constant GOLD_FOLDER_HASH = "QmGoldFolderHash";
    string constant TEACHER_HASH = "QmTeacherUniqueHash";
    string constant TA_HASH = "QmTAUniqueHash";

    function setUp() public {
        // 1. Create labeled addresses for clearer traces
        owner = makeAddr("owner");
        teacher = makeAddr("teacher");
        ta = makeAddr("ta");

        // 2. Deploy Contract as Owner
        vm.startPrank(owner);
        psoc = new ProgrammableSociety(DEFAULT_GRAY_HASH, GOLD_FOLDER_HASH);

        // 3. Setup Initial Faculty (Owner adds Teacher)
        // We need arrays for the input
        address[] memory recipients = new address[](1); 
        recipients[0] = teacher;
        
        string[] memory badges = new string[](1); 
        badges[0] = TEACHER_HASH;
        
        ProgrammableSociety.Role[] memory roles = new ProgrammableSociety.Role[](1); 
        roles[0] = ProgrammableSociety.Role.Teacher;

        psoc.addFaculty(recipients, badges, roles);
        vm.stopPrank();
    }

    // =================================================================
    // 🧪 Case 1: Enrollment Fuzzing (Basic Input & Gas Check)
    // =================================================================
    
    /**
     * @notice Verifies that enrolling a random number of students works correctly
     * and that Token IDs are assigned sequentially.
     */
    function testFuzz_Enrollment(uint8 amount) public {
        // Limit amount to avoid Block Gas Limit errors during fuzzing (e.g., max 50 at once)
        vm.assume(amount > 0 && amount < 50);

        address[] memory students = _generateUniqueStudents(amount);

        // Act: Teacher enrolls students
        vm.prank(teacher);
        psoc.enrollStudents(students);

        // Assert: The last student should own the correct Token ID
        // Logic: ID 1 is Teacher. So first student is 2. Last is 1 + amount.
        uint256 lastTokenId = 1 + amount;
        assertEq(psoc.ownerOf(lastTokenId), students[amount - 1]);
    }

    // =================================================================
    // 🧪 Case 2: State Invariant (Internal ID Logic)
    // =================================================================

    /**
     * @notice Invariant: A student's internalId MUST be 0 until they are certified.
     * This ensures no JSON file is assigned prematurely.
     */
    function testFuzz_InternalIdInvariant(uint256 randomSeed) public {
        // Generate a random student address
        address student = address(uint160(randomSeed));
        vm.assume(student != address(0) && student != teacher && student != owner);

        address[] memory s = new address[](1); 
        s[0] = student;
        
        vm.prank(teacher);
        psoc.enrollStudents(s);

        // Get the student's Token ID
        uint256 tokenId = psoc.userTokenId(student);
        
        // Read the struct from the contract
        (,,,uint256 internalId) = psoc.profiles(tokenId);
        
        // Assert: Must be 0 before certification
        assertEq(internalId, 0, "Internal ID should be 0 before certification");
    }

    // =================================================================
    // 🧪 Case 3: Abuse of Power (Permission Boundaries)
    // =================================================================

    /**
     * @notice Verifies that NO random address can call `certifyStudent`.
     * Only legitimate Faculty members can certify.
     */
    function testFuzz_AbuseOfPower(uint256 randomAddressSeed, uint8 randomTokenId) public {
        // 1. Generate a random attacker address
        address attacker = address(uint160(randomAddressSeed));
        
        // Ensure attacker is not an existing role
        vm.assume(attacker != owner && attacker != teacher && attacker != ta);
        vm.assume(attacker != address(0));

        // 2. Ensure target Token ID is valid (greater than Teacher ID)
        vm.assume(randomTokenId > 1);

        // Act & Assert: Expect Revert
        vm.startPrank(attacker);
        vm.expectRevert("Caller does not hold a badge"); // First modifier check
        psoc.certifyStudent(randomTokenId, "A");
        vm.stopPrank();
    }

    // =================================================================
    // 🧪 Case 4: Random Lifecycle (Enroll -> Certify Flow)
    // =================================================================

    /**
     * @notice Simulates a semester where N students enroll and a subset K gets certified.
     * Verifies correct metadata updates and URI transitions.
     */
    function testFuzz_RandomLifecycle(uint8 numStudents, uint8 certCount) public {
        // Constraints
        vm.assume(numStudents > 0 && numStudents < 20);
        vm.assume(certCount <= numStudents);

        address[] memory students = _generateUniqueStudents(numStudents);

        // 1. Enroll all
        vm.prank(teacher);
        psoc.enrollStudents(students);

        // 2. Certify a random subset
        for (uint256 i = 0; i < certCount; i++) {
            // Pick a student index. To avoid collision in this simple loop, 
            // we just pick the first 'certCount' students for simplicity in Fuzzing logic,
            // or we could check status before certifying.
            
            uint256 studentIndex = i; 
            uint256 tokenId = psoc.userTokenId(students[studentIndex]);

            vm.prank(teacher);
            psoc.certifyStudent(tokenId, "A+");

            // Assert: Check Invariants immediately after state change
            (,,,uint256 internalId) = psoc.profiles(tokenId);
            
            // Invariant A: Internal ID must be assigned (> 0)
            assertTrue(internalId > 0, "Internal ID missing after certification");
            
            // Invariant B: TokenURI must point to Gold Folder
            string memory uri = psoc.tokenURI(tokenId);
            // Simple check: Gold URI contains the folder hash
            assertTrue(_contains(uri, GOLD_FOLDER_HASH), "URI did not update to Gold Folder");
        }
    }

    // =================================================================
    // 🧪 Case 5: Revoke & Re-assign (Permission Degradation)
    // =================================================================

    /**
     * @notice Verifies that once a Faculty member (TA) is revoked, 
     * they immediately lose the ability to enroll students.
     */
    function testFuzz_RevokeAndReAssign(uint8 numEnrollments) public {
        vm.assume(numEnrollments > 0 && numEnrollments < 10);

        // 1. Setup: Owner adds a TA
        address[] memory rec = new address[](1); rec[0] = ta;
        string[] memory bad = new string[](1); bad[0] = TA_HASH;
        ProgrammableSociety.Role[] memory rol = new ProgrammableSociety.Role[](1); 
        rol[0] = ProgrammableSociety.Role.TA;

        vm.prank(owner);
        psoc.addFaculty(rec, bad, rol);

        // 2. TA successfully enrolls students (Control Test)
        address[] memory students = _generateUniqueStudents(numEnrollments);
        vm.prank(ta);
        psoc.enrollStudents(students); // Should succeed

        // 3. Revoke the TA
        uint256 taTokenId = psoc.userTokenId(ta);

        vm.prank(teacher);
        psoc.revoke(taTokenId);

        // 4. TA tries to enroll again (Abuse attempt after firing)
        address[] memory newStudents = _generateUniqueStudents(1);

        vm.prank(ta);
        vm.expectRevert("Caller does not hold a badge");
        psoc.enrollStudents(newStudents);
    }

    // =================================================================
    // Helpers
    // =================================================================

    /**
     * @dev Helper to generate unique addresses based on an offset.
     * Prevents collision with owner/teacher/ta.
     */
    function _generateUniqueStudents(uint8 amount) internal pure returns (address[] memory) {
        address[] memory students = new address[](amount);
        for (uint256 i = 0; i < amount; i++) {
            // Start from 100 to avoid low-number address collisions
            students[i] = address(uint160(i + 100));
        }
        return students;
    }

    /**
     * @dev Quick helper to check substring (since Solidity doesn't have .includes)
     */
    function _contains(string memory where, string memory what) internal pure returns (bool) {
        bytes memory whereBytes = bytes(where);
        bytes memory whatBytes = bytes(what);
        
        bool found = false;
        for (uint i = 0; i <= whereBytes.length - whatBytes.length; i++) {
            bool flag = true;
            for (uint j = 0; j < whatBytes.length; j++)
                if (whereBytes[i + j] != whatBytes[j]) {
                    flag = false;
                    break;
                }
            if (flag) {
                found = true;
                break;
            }
        }
        return found;
    }
}