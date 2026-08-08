// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MessChange {
    address public admin;
    address public system;

    enum Status { PENDING, APPROVED, REJECTED }

    struct ChangeRequest {
        address student;
        address fromMess;
        address toMess;
        Status status;
        uint256 requestedAt;
        uint256 effectiveDate;
        address decidedBy;
    }

    uint256 public requestCount;
    mapping(uint256 => ChangeRequest) public requests;
    mapping(address => uint256[]) public studentRequests;

    // current mess per student
    mapping(address => address) public studentMess;

    event MessChangeRequested(uint256 indexed id, address indexed student, address fromMess, address toMess);
    event MessChangeApproved(uint256 indexed id, address indexed student, address toMess, uint256 effectiveDate);
    event MessChangeRejected(uint256 indexed id, address indexed decidedBy);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlySystem() {
        require(msg.sender == system || msg.sender == admin, "Not system");
        _;
    }

    constructor(address _system) {
        admin = msg.sender;
        system = _system;
    }

    function setInitialMess(address student, address mess) external onlySystem {
        studentMess[student] = mess;
    }

    function requestMessChange(address newMess) external {
        require(studentMess[msg.sender] != address(0), "Not registered to any mess");
        require(newMess != studentMess[msg.sender], "Already in this mess");

        uint256 id = requestCount++;
        requests[id] = ChangeRequest({
            student: msg.sender,
            fromMess: studentMess[msg.sender],
            toMess: newMess,
            status: Status.PENDING,
            requestedAt: block.timestamp,
            effectiveDate: 0,
            decidedBy: address(0)
        });
        studentRequests[msg.sender].push(id);
        emit MessChangeRequested(id, msg.sender, studentMess[msg.sender], newMess);
    }

    function approveMessChange(uint256 id) external onlyAdmin {
        ChangeRequest storage r = requests[id];
        require(r.status == Status.PENDING, "Not pending");

        // effective from next midnight — do NOT flip studentMess yet
        uint256 tomorrow = (block.timestamp / 1 days + 1) * 1 days;
        r.status = Status.APPROVED;
        r.effectiveDate = tomorrow;
        r.decidedBy = msg.sender;

        emit MessChangeApproved(id, r.student, r.toMess, tomorrow);
    }

    /**
     * Called by the system (midnight cron) once effectiveDate has passed.
     * This is the only place studentMess actually gets flipped.
     */
    function applyMessChange(uint256 id) external onlySystem {
        ChangeRequest storage r = requests[id];
        require(r.status == Status.APPROVED, "Not approved");
        require(block.timestamp >= r.effectiveDate, "Effective date not reached");
        require(studentMess[r.student] != r.toMess, "Already applied");

        studentMess[r.student] = r.toMess;
    }

    function rejectMessChange(uint256 id) external onlyAdmin {
        ChangeRequest storage r = requests[id];
        require(r.status == Status.PENDING, "Not pending");
        r.status = Status.REJECTED;
        r.decidedBy = msg.sender;
        emit MessChangeRejected(id, msg.sender);
    }

    function getCurrentMess(address student) external view returns (address) {
        return studentMess[student];
    }

    function getStudentRequests(address student)
        external view returns (uint256[] memory) {
        return studentRequests[student];
    }

    function updateSystem(address _system) external onlyAdmin {
        system = _system;
    }
}
