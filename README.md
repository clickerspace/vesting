# 5-vesting

## Project structure

- `contracts` - source code of all the smart contracts of the project and their dependencies.
- `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
- `tests` - tests for the contracts.
- `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Documentation Link

[Documentation](https://nice-alloy-49f.notion.site/Vesting-D-k-man-1ac50210a3f980f8967fd74321581520?pvs=4)
