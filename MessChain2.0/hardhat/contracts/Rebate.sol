// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Rebate {
    address public admin;

    enum Status { PENDING, APPROVED, REJECTED }

    struct RebateRequest {
        address student;
        uint256 fromDate;
        uint256 toDate;
        Status status;
        uint256 requestedAt;
        uint256 decidedAt;
        address decidedBy;
    }

    uint256 public requestCount;
    mapping(uint256 => RebateRequest) public requests;

    // student → requestId[]
    mapping(address => uint256[]) public studentRequests;

    event RebateRequested(uint256 indexed id, address indexed student, uint256 fromDate, uint256 toDate);
    event RebateApproved(uint256 indexed id, address indexed decidedBy);
    event RebateRejected(uint256 indexed id, address indexed decidedBy);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function requestRebate(uint256 fromDate, uint256 toDate) external {
        require(fromDate > block.timestamp, "From date must be in future");
        require(toDate > fromDate, "To date must be after from date");
        require((toDate - fromDate) / 1 days <= 15, "Max 15 days");

        uint256 id = requestCount++;
        requests[id] = RebateRequest({
            student: msg.sender,
            fromDate: fromDate,
            toDate: toDate,
            status: Status.PENDING,
            requestedAt: block.timestamp,
            decidedAt: 0,
            decidedBy: address(0)
        });
        studentRequests[msg.sender].push(id);
        emit RebateRequested(id, msg.sender, fromDate, toDate);
    }

    function approveRebate(uint256 id) external onlyAdmin {
        RebateRequest storage r = requests[id];
        require(r.status == Status.PENDING, "Not pending");
        r.status = Status.APPROVED;
        r.decidedAt = block.timestamp;
        r.decidedBy = msg.sender;
        emit RebateApproved(id, msg.sender);
    }

    function rejectRebate(uint256 id) external onlyAdmin {
        RebateRequest storage r = requests[id];
        require(r.status == Status.PENDING, "Not pending");
        r.status = Status.REJECTED;
        r.decidedAt = block.timestamp;
        r.decidedBy = msg.sender;
        emit RebateRejected(id, msg.sender);
    }

    function isRebateActive(address student, uint256 date)
        external view returns (bool) {
        uint256[] memory ids = studentRequests[student];
        for (uint256 i = 0; i < ids.length; i++) {
            RebateRequest memory r = requests[ids[i]];
            if (
                r.status == Status.APPROVED &&
                date >= r.fromDate &&
                date <= r.toDate
            ) {
                return true;
            }
        }
        return false;
    }

    function getStudentRequests(address student)
        external view returns (uint256[] memory) {
        return studentRequests[student];
    }
}
