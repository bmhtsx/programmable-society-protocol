// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Programmable Society Protocol (Optimized)
 * @notice EIP-5192 SBT with Storage Optimization (Union Field).
 */
contract ProgrammableSociety is ERC721, Ownable {
    using Strings for uint256;

    // --- Counters ---
    uint256 private _nextTokenId;
    
    // Increments ONLY upon certification (maps to 1.json, 2.json...)
    uint256 private _studentCounter;

    // --- Data Structures ---
    enum Role { Student, TA, Teacher }

    struct Profile {
        Role role;             // Enum (uint8)
        bool isCertified;      // bool (1 byte)
        
        // OPTIMIZATION: Shared Storage Field (Union)
        // - If Faculty: Stores "personalIpfsHash" (e.g., "QmHash...")
        // - If Student: Stores "grade" (e.g., "Distinction")
        string data; 
        
        uint256 internalId;    // For Certified Students only (maps to JSON file)
    }

    // --- State Storage ---
    mapping(uint256 => Profile) public profiles;
    mapping(address => uint256) public userTokenId;
    
    // Default Gray Badge Hash
    string public defaultStudentHash;
    
    // Gold Folder Hash (e.g., "QmFolder...")
    string public studentGoldFolderHash;

    // --- Events ---
    event Locked(uint256 tokenId);
    event StudentCertified(uint256 indexed tokenId, string grade, address certifiedBy);
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    constructor(string memory _defaultStudentHash, string memory _studentGoldFolderHash) 
        ERC721("Programmable-Society", "PSOC") 
        Ownable(msg.sender) 
    {
        _nextTokenId = 1;
        _studentCounter = 0; 
        defaultStudentHash = _defaultStudentHash;
        studentGoldFolderHash = _studentGoldFolderHash;
    }

    modifier onlyFaculty() {
        uint256 callerId = userTokenId[msg.sender];
        require(callerId != 0, "Caller does not hold a badge");
        
        Role role = profiles[callerId].role;
        require(role == Role.Teacher || role == Role.TA, "Caller is not Faculty");
        _;
    }

    // --- Core Functions ---

    /**
     * @dev Add Faculty. 
     * Stores the IPFS Hash into the `data` field.
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
                isCertified: true,
                // Faculty Logic: data = IPFS Hash
                data: badgeHashes[i], 
                internalId: 0
            });

            userTokenId[recipients[i]] = tokenId;
            emit Locked(tokenId);
        }
    }

    /**
     * @dev Enroll Students.
     * Initializes `data` as empty string (no grade yet).
     */
    function enrollStudents(address[] calldata students) external onlyFaculty {
        for (uint256 i = 0; i < students.length; i++) {
            uint256 tokenId = _nextTokenId++;
            // Note: internalId is 0 (unassigned) until certification

            _safeMint(students[i], tokenId);

            profiles[tokenId] = Profile({
                role: Role.Student,
                isCertified: false,
                // Student Logic: data = Grade (Empty initially)
                data: "", 
                internalId: 0
            });

            userTokenId[students[i]] = tokenId;
            emit Locked(tokenId);
        }
    }

    /**
     * @dev Certify Student.
     * Stores the Grade into the `data` field.
     */
    function certifyStudent(
        uint256 studentTokenId,
        string calldata grade
    ) external onlyFaculty {
        require(profiles[studentTokenId].role == Role.Student, "Target is not a Student");
        require(!profiles[studentTokenId].isCertified, "Student already certified");

        _studentCounter++; // Increment counter to assign new JSON file
        
        profiles[studentTokenId].internalId = _studentCounter;
        profiles[studentTokenId].isCertified = true;
        
        // Student Logic: data = Grade
        profiles[studentTokenId].data = grade;

        emit StudentCertified(studentTokenId, grade, msg.sender);
    }

    function setStudentGoldFolderHash(string memory _newFolderHash) external onlyOwner {
        studentGoldFolderHash = _newFolderHash;
        emit BatchMetadataUpdate(1, _nextTokenId);
    }

    // --- Dynamic Metadata Logic ---

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Profile storage p = profiles[tokenId];

        // Logic A: Faculty -> `data` contains the Personal IPFS Hash
        if (p.role == Role.Teacher || p.role == Role.TA) {
            return string(abi.encodePacked("ipfs://", p.data));
        }
        
        // Logic B: Student -> `data` contains Grade (Ignored here), use internalId
        if (p.isCertified) {
            return string(abi.encodePacked(
                "ipfs://", 
                studentGoldFolderHash, 
                "/", 
                p.internalId.toString(), 
                ".json"
            ));
        } else {
            return string(abi.encodePacked("ipfs://", defaultStudentHash));
        }
    }

    // --- Standard SBT Logic ---

    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId); return true; 
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == bytes4(0xb45a3c0e) || super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("SBT: Transfer not allowed");
        }
        return super._update(to, tokenId, auth);
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "You do not own this badge");
        _burn(tokenId);
        delete userTokenId[msg.sender];
        delete profiles[tokenId];
    }

    function revoke(uint256 tokenId) external onlyFaculty {
        address owner = ownerOf(tokenId);
        _burn(tokenId);
        delete userTokenId[owner];
        delete profiles[tokenId];
    }
}