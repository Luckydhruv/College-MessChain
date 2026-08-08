// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Governance {
    address public admin;

    // ─── Complaints ───
    struct Complaint {
        address student;
        address mess;
        string cid;        // IPFS CID of full complaint text
        uint256 timestamp;
    }

    uint256 public complaintCount;
    mapping(uint256 => Complaint) public complaints;

    // ─── Feedback ───
    struct Feedback {
        address student;
        address mess;
        string cid;        // IPFS CID of full feedback text
        uint256 timestamp;
    }

    uint256 public feedbackCount;
    mapping(uint256 => Feedback) public feedbacks;

    // ─── Polls ───
    struct Poll {
        string cid;        // IPFS CID of poll question + options
        uint256 optionCount;
        uint256 createdAt;
        bool active;
    }

    uint256 public pollCount;
    mapping(uint256 => Poll) public polls;

    // pollId → optionIndex → vote count
    mapping(uint256 => mapping(uint256 => uint256)) public pollVotes;

    // pollId → student → has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ─── Events ───
    event ComplaintFiled(uint256 indexed id, address indexed student, address indexed mess, string cid);
    event FeedbackFiled(uint256 indexed id, address indexed student, address indexed mess, string cid);
    event PollCreated(uint256 indexed id, string cid, uint256 optionCount);
    event Voted(uint256 indexed pollId, address indexed student, uint256 option);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function fileComplaint(address mess, string calldata cid) external {
        uint256 id = complaintCount++;
        complaints[id] = Complaint({
            student: msg.sender,
            mess: mess,
            cid: cid,
            timestamp: block.timestamp
        });
        emit ComplaintFiled(id, msg.sender, mess, cid);
    }

    function fileFeedback(address mess, string calldata cid) external {
        uint256 id = feedbackCount++;
        feedbacks[id] = Feedback({
            student: msg.sender,
            mess: mess,
            cid: cid,
            timestamp: block.timestamp
        });
        emit FeedbackFiled(id, msg.sender, mess, cid);
    }

    function createPoll(string calldata cid, uint256 optionCount)
        external onlyAdmin {
        uint256 id = pollCount++;
        polls[id] = Poll({
            cid: cid,
            optionCount: optionCount,
            createdAt: block.timestamp,
            active: true
        });
        emit PollCreated(id, cid, optionCount);
    }

    function vote(uint256 pollId, uint256 option) external {
        Poll memory p = polls[pollId];
        require(p.active, "Poll not active");
        require(option < p.optionCount, "Invalid option");
        require(!hasVoted[pollId][msg.sender], "Already voted");

        hasVoted[pollId][msg.sender] = true;
        pollVotes[pollId][option]++;
        emit Voted(pollId, msg.sender, option);
    }

    function closePoll(uint256 pollId) external onlyAdmin {
        polls[pollId].active = false;
    }

    function getPollVotes(uint256 pollId, uint256 option)
        external view returns (uint256) {
        return pollVotes[pollId][option];
    }
}
