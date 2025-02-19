const hre = require('hardhat')

async function deployProxy() {
  const owner = '0xB89560D7b33ea8d787EaaEfbcE1268f8991Db9E1'
  const permissionlessCreator = '0x0b5e6100243f793e480DE6088dE6bA70aA9f3872'

  const TapePermissionlessCreator = await hre.ethers.getContractFactory(
    'TapePermissionlessCreator'
  )
  const deployProxy = await hre.upgrades.deployProxy(
    TapePermissionlessCreator,
    [owner, permissionlessCreator]
  )
  await deployProxy.waitForDeployment()

  const proxyAddress = await deployProxy.getAddress()
  console.log(`TapePermissonlessCreator Proxy deployed to ${proxyAddress}`)

  const currentImplAddress =
    await hre.upgrades.erc1967.getImplementationAddress(proxyAddress)
  console.log(
    `TapePermissonlessCreator Implementation deployed to ${currentImplAddress}`
  )
}

// async function upgradeProxy() {
//   const PROXY_ADDRESS = '0x68357D5F02a3913132577c7aC0847feade9a05aC'

//   const TapePermissionlessCreatorV2 = await hre.ethers.getContractFactory(
//     'TapePermissonlessCreatorV2'
//   )
//   await hre.upgrades.upgradeProxy(PROXY_ADDRESS, TapePermissionlessCreatorV2)
//   console.log('Proxy upgraded')
// }

deployProxy().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

// upgradeProxy().catch((error) => {
//   console.error(error)
//   process.exitCode = 1
// })
