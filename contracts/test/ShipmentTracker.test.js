const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("ShipmentTracker", function () {
  let shipmentTracker;
  let owner, tracker1, tracker2, unauthorized;
  let proxyAddress, implementationAddress;

  beforeEach(async function () {
    [owner, tracker1, tracker2, unauthorized] = await ethers.getSigners();

    const ShipmentTracker = await ethers.getContractFactory("ShipmentTracker");
    
    // Deploy with Transparent Proxy
    shipmentTracker = await upgrades.deployProxy(
      ShipmentTracker,
      [owner.address],
      {
        initializer: 'initialize',
        kind: 'transparent'
      }
    );

    await shipmentTracker.waitForDeployment();
    proxyAddress = await shipmentTracker.getAddress();
    implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    // Authorize trackers
    await shipmentTracker.authorizeTracker(tracker1.address);
    await shipmentTracker.authorizeTracker(tracker2.address);
  });

  describe("Proxy Architecture", function () {
    it("Should deploy with correct proxy pattern", async function () {
      expect(proxyAddress).to.not.equal(implementationAddress);
      expect(await upgrades.erc1967.getImplementationAddress(proxyAddress)).to.equal(implementationAddress);
    });

    it("Should initialize correctly", async function () {
      expect(await shipmentTracker.owner()).to.equal(owner.address);
      expect(await shipmentTracker.nextShipmentId()).to.equal(1);
      expect(await shipmentTracker.totalShipments()).to.equal(0);
    });

    it("Should prevent direct initialization of implementation", async function () {
      const ShipmentTracker = await ethers.getContractFactory("ShipmentTracker");
      const implementation = await ShipmentTracker.deploy();
      await implementation.waitForDeployment();
      
      await expect(
        implementation.initialize(owner.address)
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("Shipment Management", function () {
    it("Should create shipment successfully", async function () {
      const tx = await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      const receipt = await tx.wait();

      expect(receipt.logs).to.have.length.greaterThan(0);
      
      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.batchNumber).to.equal("BATCH-001");
      expect(shipment.tracker).to.equal(tracker1.address);
      expect(shipment.isActive).to.be.true;
    });

    it("Should reject invalid shipment creation", async function () {
      await expect(
        shipmentTracker.createShipment("", tracker1.address)
      ).to.be.revertedWith("ShipmentTracker: Batch number required");

      await expect(
        shipmentTracker.createShipment("BATCH-001", ethers.ZeroAddress)
      ).to.be.revertedWith("ShipmentTracker: Invalid tracker address");
    });

    it("Should only allow owner to create shipments", async function () {
      await expect(
        shipmentTracker.connect(tracker1).createShipment("BATCH-001", tracker1.address)
      ).to.be.revertedWithCustomError(shipmentTracker, "OwnableUnauthorizedAccount");
    });
  });

  describe("Temperature Monitoring", function () {
    beforeEach(async function () {
      await shipmentTracker.createShipment("BATCH-001", tracker1.address);
    });

    it("Should update temperature within safe range", async function () {
      const trackerContract = shipmentTracker.connect(tracker1);
      
      await expect(
        trackerContract.updateStatus(1, -500, "Warehouse A") // -5°C
      ).to.emit(shipmentTracker, "TemperatureUpdated")
        .withArgs(1, -500, "Warehouse A", await time.latest() + 1);

      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.currentTemperature).to.equal(-500);
      expect(shipment.location).to.equal("Warehouse A");
    });

    it("Should trigger temperature alert and revert on breach", async function () {
      const trackerContract = shipmentTracker.connect(tracker1);
      
      // Test high temperature breach
      await expect(
        trackerContract.updateStatus(1, 1000, "Hot Zone") // 10°C (above 8°C limit)
      ).to.emit(shipmentTracker, "TemperatureAlert")
        .and.to.emit(shipmentTracker, "ShipmentReverted");

      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.status).to.equal(4); // Reverted
      expect(shipment.isActive).to.be.false;
    });

    it("Should handle low temperature breach", async function () {
      const trackerContract = shipmentTracker.connect(tracker1);
      
      await expect(
        trackerContract.updateStatus(1, -9000, "Freezer Malfunction") // -90°C
      ).to.emit(shipmentTracker, "TemperatureAlert")
        .withArgs(1, -9000, -8000, "CRITICAL_LOW", await time.latest() + 1);
    });

    it("Should reject unauthorized temperature updates", async function () {
      await expect(
        shipmentTracker.connect(unauthorized).updateStatus(1, -500, "Warehouse A")
      ).to.be.revertedWith("ShipmentTracker: Not authorized tracker");
    });

    it("Should reject updates from wrong tracker", async function () {
      await expect(
        shipmentTracker.connect(tracker2).updateStatus(1, -500, "Warehouse A")
      ).to.be.revertedWith("ShipmentTracker: Unauthorized for this shipment");
    });
  });

  describe("Delivery Management", function () {
    beforeEach(async function () {
      await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      // Move to InTransit status
      await shipmentTracker.connect(tracker1).updateStatus(1, -500, "In Transit");
    });

    it("Should mark shipment as delivered", async function () {
      await expect(
        shipmentTracker.connect(tracker1).markDelivered(1)
      ).to.emit(shipmentTracker, "StatusUpdated");

      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.status).to.equal(3); // Delivered
      expect(shipment.isActive).to.be.false;
    });

    it("Should reject delivery of non-transit shipments", async function () {
      // Create new shipment (status: Created)
      await shipmentTracker.createShipment("BATCH-002", tracker1.address);
      
      await expect(
        shipmentTracker.connect(tracker1).markDelivered(2)
      ).to.be.revertedWith("ShipmentTracker: Invalid status for delivery");
    });
  });

  describe("Tracker Authorization", function () {
    it("Should authorize new tracker", async function () {
      const newTracker = unauthorized;
      
      await expect(
        shipmentTracker.authorizeTracker(newTracker.address)
      ).to.emit(shipmentTracker, "TrackerAuthorized")
        .withArgs(newTracker.address, await time.latest() + 1);

      expect(await shipmentTracker.isTrackerAuthorized(newTracker.address)).to.be.true;
    });

    it("Should revoke tracker authorization", async function () {
      await expect(
        shipmentTracker.revokeTracker(tracker1.address)
      ).to.emit(shipmentTracker, "TrackerRevoked");

      expect(await shipmentTracker.isTrackerAuthorized(tracker1.address)).to.be.false;
    });

    it("Should reject duplicate authorization", async function () {
      await expect(
        shipmentTracker.authorizeTracker(tracker1.address)
      ).to.be.revertedWith("ShipmentTracker: Tracker already authorized");
    });
  });

  describe("Pausable Functionality", function () {
    it("Should pause and unpause contract", async function () {
      await shipmentTracker.pause();
      expect(await shipmentTracker.paused()).to.be.true;

      await expect(
        shipmentTracker.createShipment("BATCH-001", tracker1.address)
      ).to.be.revertedWithCustomError(shipmentTracker, "EnforcedPause");

      await shipmentTracker.unpause();
      expect(await shipmentTracker.paused()).to.be.false;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      await shipmentTracker.createShipment("BATCH-002", tracker1.address);
    });

    it("Should return correct contract stats", async function () {
      const stats = await shipmentTracker.getContractStats();
      expect(stats.total).to.equal(2);
      expect(stats.active).to.equal(2);
      expect(stats.nextId).to.equal(3);
    });

    it("Should return tracker shipments", async function () {
      const shipments = await shipmentTracker.getTrackerShipments(tracker1.address);
      expect(shipments).to.have.length(2);
      expect(shipments[0]).to.equal(1);
      expect(shipments[1]).to.equal(2);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs", async function () {
      const tx1 = await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      const receipt1 = await tx1.wait();
      console.log("Create Shipment Gas Used:", receipt1.gasUsed.toString());

      const tx2 = await shipmentTracker.connect(tracker1).updateStatus(1, -500, "Location A");
      const receipt2 = await tx2.wait();
      console.log("Update Status Gas Used:", receipt2.gasUsed.toString());

      // Reasonable gas limits
      expect(receipt1.gasUsed).to.be.below(200000);
      expect(receipt2.gasUsed).to.be.below(150000);
    });
  });
});

// Helper to get latest block timestamp
const time = {
  latest: async () => {
    const block = await ethers.provider.getBlock('latest');
    return block.timestamp;
  }
};