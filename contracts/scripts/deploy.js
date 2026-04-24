const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Deploying ShipmentTracker with Transparent Proxy...");
  
  const [deployer, tracker1, tracker2] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the ShipmentTracker implementation behind a Transparent Proxy
  const ShipmentTracker = await ethers.getContractFactory("ShipmentTracker");
  
  console.log("📦 Deploying ShipmentTracker implementation...");
  
  // Deploy with Transparent Proxy pattern
  const shipmentTracker = await upgrades.deployProxy(
    ShipmentTracker,
    [deployer.address], // Initialize with deployer as owner
    {
      initializer: 'initialize',
      kind: 'transparent'
    }
  );

  await shipmentTracker.waitForDeployment();
  
  const proxyAddress = await shipmentTracker.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("✅ ShipmentTracker Proxy deployed to:", proxyAddress);
  console.log("📋 Implementation address:", implementationAddress);
  console.log("🔐 Proxy Admin address:", adminAddress);

  // Authorize some tracker devices
  console.log("\n🔑 Authorizing tracker devices...");
  
  await shipmentTracker.authorizeTracker(tracker1.address);
  console.log("✅ Authorized tracker 1:", tracker1.address);
  
  await shipmentTracker.authorizeTracker(tracker2.address);
  console.log("✅ Authorized tracker 2:", tracker2.address);

  // Create a test shipment
  console.log("\n📦 Creating test shipment...");
  
  const tx = await shipmentTracker.createShipment("BATCH-001", tracker1.address);
  const receipt = await tx.wait();
  
  // Find the ShipmentCreated event
  const shipmentCreatedEvent = receipt.logs.find(
    log => log.fragment && log.fragment.name === 'ShipmentCreated'
  );
  
  if (shipmentCreatedEvent) {
    console.log("✅ Test shipment created with ID:", shipmentCreatedEvent.args[0].toString());
  }

  // Test temperature update (within safe range)
  console.log("\n🌡️  Testing temperature update...");
  
  const trackerContract = shipmentTracker.connect(tracker1);
  await trackerContract.updateStatus(1, -500, "Warehouse A"); // -5°C
  console.log("✅ Temperature updated successfully");

  // Display contract stats
  const stats = await shipmentTracker.getContractStats();
  console.log("\n📊 Contract Statistics:");
  console.log("Total Shipments:", stats.total.toString());
  console.log("Active Shipments:", stats.active.toString());
  console.log("Next Shipment ID:", stats.nextId.toString());

  // Save deployment info
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    contracts: {
      ShipmentTracker: {
        proxy: proxyAddress,
        implementation: implementationAddress,
        admin: adminAddress
      }
    },
    accounts: {
      deployer: deployer.address,
      tracker1: tracker1.address,
      tracker2: tracker2.address
    },
    deployedAt: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync(
    './deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployment-info.json");
  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });