const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.create({
      data: {
        name: 'admin',
        email: 'admin@mail.com',
        password: 'adminadmin',
        emailVerified: true,
        image: '',
      },
    });
    console.log('✅ Success: User created with email:', user.email);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️ Note: User already exists.');
    } else {
      console.error('❌ Error creating user:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
