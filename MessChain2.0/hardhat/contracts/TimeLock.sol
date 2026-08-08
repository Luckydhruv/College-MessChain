// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TimeLock {
    address public admin;
    address public system;

    // txId → exists
    mapping(bytes32 => bool) public txExists;
    // txId → verified (QR scanned)
    mapping(bytes32 => bool) public txVerified;

    event TxCreated(bytes32 indexed txId, address indexed student, address indexed mess, uint256 date);
    event TxVerified(bytes32 indexed txId, address indexed student, uint256 timestamp);

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

    function computeTxId(address student, address mess, uint256 date)
        public pure returns (bytes32) {
        return keccak256(abi.encodePacked(student, mess, date));
    }

    function createDailyTx(address student, address mess, uint256 date)
        external onlySystem {
        bytes32 txId = computeTxId(student, mess, date);
        require(!txExists[txId], "Tx already exists for today");
        txExists[txId] = true;
        emit TxCreated(txId, student, mess, date);
    }

    function verifyTx(address student, address mess, uint256 date)
        external onlySystem returns (bool) {
        bytes32 txId = computeTxId(student, mess, date);
        require(txExists[txId], "No tx found for today");
        require(!txVerified[txId], "Already verified");
        txVerified[txId] = true;
        emit TxVerified(txId, student, block.timestamp);
        return true;
    }

    function hasTx(address student, address mess, uint256 date)
        external view returns (bool) {
        return txExists[computeTxId(student, mess, date)];
    }

    function updateSystem(address _system) external onlyAdmin {
        system = _system;
    }
}
