require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { ethers } = require('ethers');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed messes
  const mess1 = await prisma.mess.upsert({
    where: { name: 'Mess 1' },
    update: {},
    create: { id: ethers.Wallet.createRandom().address, name: 'Mess 1' },
  });

  const mess2 = await prisma.mess.upsert({
    where: { name: 'Mess 2' },
    update: {},
    create: { id: ethers.Wallet.createRandom().address, name: 'Mess 2' },
  });

  console.log('Messes seeded:', mess1.name, mess2.name);

  // Seed admin
  const adminEmail = 'admin@mess.edu';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log('Admin already exists, skipping');
  } else {
    const { encryptPrivateKey } = require('../src/config/crypto');
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    const encryptedDeployerKey = deployerKey ? encryptPrivateKey(deployerKey) : 'deployer';

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: await bcrypt.hash('admin_strong_password', 10),
        role: 'ADMIN',
        name: 'Super Admin',
        walletAddress: '0x70a8bef9019b999cbff35b861ca6a6adcd012bf7', // deployer address
        walletPrivateKey: encryptedDeployerKey,
      },
    });
    console.log('Admin seeded:', admin.email);
  }

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
