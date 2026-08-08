// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Token {
    address public admin;
    address public system;

    mapping(address => uint256) public balances;

    event TokensMinted(address indexed student, uint256 amount, uint256 timestamp);
    event TokensDeducted(address indexed student, uint256 amount, uint256 timestamp);
    event SemesterEnrollment(address indexed student, uint256 minted, uint256 previousBalance);

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

    function mintTokens(address student, uint256 amount) external onlyAdmin {
        balances[student] += amount;
        emit TokensMinted(student, amount, block.timestamp);
    }

    function deductTokens(address student, uint256 amount) external onlySystem {
        require(balances[student] >= amount, "Insufficient balance");
        balances[student] -= amount;
        emit TokensDeducted(student, amount, block.timestamp);
    }

    function semesterEnrollment(address student) external onlyAdmin {
        uint256 previous = balances[student];
        uint256 toMint = previous >= 1000 ? 2000 : 3000;
        balances[student] += toMint;
        emit SemesterEnrollment(student, toMint, previous);
    }

    function getBalance(address student) external view returns (uint256) {
        return balances[student];
    }

    function updateSystem(address _system) external onlyAdmin {
        system = _system;
    }
}
