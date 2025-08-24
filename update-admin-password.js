const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash('admin', 12);
    
    // Update the admin user's password
    const updatedAdmin = await prisma.user.update({
      where: {
        username: 'admin'
      },
      data: {
        password: hashedPassword
      }
    });
    
    console.log('Admin password updated successfully!');
    console.log('Login credentials: username="admin", password="admin"');
    
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();