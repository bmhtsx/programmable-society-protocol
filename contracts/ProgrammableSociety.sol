// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Programmable Society Protocol
 * @notice An EIP-5192 compliant Soulbound Token (SBT) protocol for educational credentials.
 * @dev Implements RBAC (Owner -> Faculty -> Students), dynamic metadata, and revocation logic.
 */
contract ProgrammableSociety is ERC721, Ownable {
    uint256 private _nextTokenId;

    // --- Role Definitions ---
    enum Role { Student, TA, Teacher }

    // --- Profile Structure ---
    struct Profile {
        Role role;
        bool isCertified;        // True if the student has passed the course
        string grade;            // Grade or remarks (e.g., "A", "Pass")
        string personalIpfsHash; // Unique badge hash (For Faculty or Certified Students)
    }

    // --- State Variables ---
    mapping(uint256 => Profile) public profiles;
    
    // Reverse mapping: Address -> Token ID (Used for permission checks)
    mapping(address => uint256) public userTokenId;
    
    // Global default hash for uncertified students (Saves gas)
    string public defaultStudentHash;

    // --- Events ---
    // EIP-5192 Event: Emitted when a token is locked
    event Locked(uint256 tokenId);
    
    // Custom Event: Emitted when a student completes the course
    event StudentCertified(uint256 indexed tokenId, string grade, address certifiedBy);

    /**
     * @param _defaultStudentHash The IPFS hash for the standard "Enrolled/Gray" badge.
     */
    constructor(string memory _defaultStudentHash) 
        ERC721("Programmable-Society", "PSOC") 
        Ownable(msg.sender) 
    {
        _nextTokenId = 1;
        defaultStudentHash = _defaultStudentHash;
    }

    // --- Modifiers ---

    /**
     * @dev Restricts access to Teachers or TAs.
     * Automatically resolves the caller's Token ID to check their role.
     */
    modifier onlyFaculty() {
        uint256 callerId = userTokenId[msg.sender];
        require(callerId != 0, "Caller does not hold a badge");
        
        Role role = profiles[callerId].role;
        require(role == Role.Teacher || role == Role.TA, "Caller is not Faculty");
        _;
    }

    // --- Core Functions ---

    /**
     * @dev Step 1: Owner adds Faculty (Teachers/TAs).
     * Grants them a unique identity badge immediately.
     */
    function addFaculty(
        address[] calldata recipients,
        string[] calldata badgeHashes,
        Role[] calldata roles
    ) external onlyOwner {
        require(recipients.length == badgeHashes.length && recipients.length == roles.length, "Input length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(roles[i] == Role.Teacher || roles[i] == Role.TA, "Role must be Faculty");
            
            uint256 tokenId = _nextTokenId++;
            _safeMint(recipients[i], tokenId);

            profiles[tokenId] = Profile({
                role: roles[i],
                isCertified: true, // Faculty are trusted by default
                grade: "N/A",
                personalIpfsHash: badgeHashes[i]
            });

            userTokenId[recipients[i]] = tokenId;
            emit Locked(tokenId); // Mark as SBT
        }
    }

    /**
     * @dev Step 2: Faculty enrolls Students.
     * Students receive the default (gray) badge to save gas.
     */
    function enrollStudents(address[] calldata students) external onlyFaculty {
        for (uint256 i = 0; i < students.length; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(students[i], tokenId);

            profiles[tokenId] = Profile({
                role: Role.Student,
                isCertified: false,
                grade: "",
                personalIpfsHash: "" // Empty means "Use Default Hash"
            });

            userTokenId[students[i]] = tokenId;
            emit Locked(tokenId);
        }
    }

    /**
     * @dev Step 3: Faculty certifies a Student.
     * Updates status and assigns a unique final badge (e.g., Gold Badge).
     */
    function certifyStudent(
        uint256 studentTokenId,
        string calldata grade,
        string calldata finalUniqueHash
    ) external onlyFaculty {
        require(profiles[studentTokenId].role == Role.Student, "Target is not a Student");
        require(!profiles[studentTokenId].isCertified, "Student already certified");

        // Update state logic (No new minting, just state change)
        profiles[studentTokenId].isCertified = true;
        profiles[studentTokenId].grade = grade;
        profiles[studentTokenId].personalIpfsHash = finalUniqueHash;

        emit StudentCertified(studentTokenId, grade, msg.sender);
    }

    // --- Lifecycle Management (Burn/Revoke) ---

    /**
     * @dev Allow users to burn their own badge (Right to be forgotten).
     */
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "You do not own this badge");
        _burn(tokenId);
        delete userTokenId[msg.sender]; // Clean up mapping
        delete profiles[tokenId];       // Clean up profile
    }

    /**
     * @dev Allow Faculty to revoke a badge (e.g., for academic dishonesty).
     */
    function revoke(uint256 tokenId) external onlyFaculty {
        address owner = ownerOf(tokenId);
        _burn(tokenId);
        delete userTokenId[owner];
        delete profiles[tokenId];
    }

    // --- View Functions ---

    /**
     * @dev Dynamic Metadata Logic.
     * Returns personal hash if set, otherwise returns global default hash.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Profile storage p = profiles[tokenId];

        string memory hashToUse;

        if (bytes(p.personalIpfsHash).length > 0) {
            // Case A: Faculty OR Certified Student
            hashToUse = p.personalIpfsHash;
        } else {
            // Case B: Uncertified Student (Enrolled)
            hashToUse = defaultStudentHash;
        }

        return string(abi.encodePacked("ipfs://", hashToUse));
    }

    // --- SBT & Standard Compliance ---

    /**
     * @dev EIP-5192: Returns true if the token is locked (Soulbound).
     */
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /**
     * @dev Standard ERC-165 interface check.
     */
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        // 0xb45a3c0e is the interface ID for EIP-5192
        return interfaceId == bytes4(0xb45a3c0e) || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Hook that disables token transfers (Soulbound logic).
     * Allows Mint (from=0) and Burn (to=0), but prevents Transfer.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("SBT: Transfer not allowed");
        }
        return super._update(to, tokenId, auth);
    }
}