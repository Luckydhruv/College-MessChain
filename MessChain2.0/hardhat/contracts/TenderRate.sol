// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TenderRate {
    address public admin;

    struct Rate {
        uint256 tokensPerDay;
        uint256 effectiveFrom;
        uint256 effectiveTo;   // 0 = currently active
        address setBy;
    }

    Rate[] public rates;

    event RateSet(uint256 indexed index, uint256 tokensPerDay, uint256 effectiveFrom, address setBy);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(uint256 initialTokensPerDay) {
        admin = msg.sender;
        rates.push(Rate({
            tokensPerDay: initialTokensPerDay,
            effectiveFrom: block.timestamp,
            effectiveTo: 0,
            setBy: msg.sender
        }));
        emit RateSet(0, initialTokensPerDay, block.timestamp, msg.sender);
    }

    function setRate(uint256 tokensPerDay) external onlyAdmin {
        // close current rate
        rates[rates.length - 1].effectiveTo = block.timestamp;

        // push new rate
        rates.push(Rate({
            tokensPerDay: tokensPerDay,
            effectiveFrom: block.timestamp,
            effectiveTo: 0,
            setBy: msg.sender
        }));
        emit RateSet(rates.length - 1, tokensPerDay, block.timestamp, msg.sender);
    }

    function getCurrentRate() external view returns (uint256) {
        return rates[rates.length - 1].tokensPerDay;
    }

    function getRateForDate(uint256 date) external view returns (uint256) {
        for (uint256 i = rates.length; i > 0; i--) {
            Rate memory r = rates[i - 1];
            if (date >= r.effectiveFrom) {
                return r.tokensPerDay;
            }
        }
        return rates[0].tokensPerDay;
    }

    function getRateCount() external view returns (uint256) {
        return rates.length;
    }
}
