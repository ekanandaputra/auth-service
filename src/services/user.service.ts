import { prisma } from '../repositories/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import * as xlsx from 'xlsx';
import bcrypt from 'bcrypt';
import { UserType } from '@prisma/client';
import { createPaginatedResult, PaginatedResult } from '../utils/pagination';

export class UserService {
  static async getUsers(page: number = 1, limit: number = 10): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, email: true, name: true, nip: true, type: true, isActive: true, createdAt: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return createPaginatedResult(users, total, { page, limit });
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        permissions: { include: { permission: true } }
      }
    });

    if (!user || user.deletedAt) throw new NotFoundError('User not found');
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async softDeleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  static async updateUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundError('User not found');

    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  static async importUsersFromBuffer(buffer: Buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Parse to JSON
    const rows = xlsx.utils.sheet_to_json<any>(sheet);
    if (rows.length === 0) {
      throw new BadRequestError('Excel file is empty');
    }

    let successCount = 0;
    let skipCount = 0;
    let errors: { row: number, error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +1 for 0-index, +1 for header

      try {
        const email = row.email || row.Email;
        const name = row.name || row.Name || row.nama || row.Nama;
        let nip = row.nip || row.NIP;
        let typeRaw = row.type || row.Type || row.jenis || row.Jenis;

        // Remove backticks or single quotes often used in Excel to format as string
        if (nip) {
          nip = String(nip).replace(/['`]/g, '').trim();
        }

        if (!email && !nip) {
          errors.push({ row: rowNumber, error: 'Either Email or NIP is required' });
          continue;
        }

        const orConditions: any[] = [];
        if (email) orConditions.push({ email });
        if (nip) orConditions.push({ nip: nip.toString() });

        // Check duplicate
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: orConditions
          }
        });

        if (existingUser) {
          skipCount++;
          continue;
        }

        // Determine user type
        let userType: UserType | undefined = undefined;
        if (typeRaw) {
          typeRaw = String(typeRaw).toUpperCase();
          if (typeRaw === 'EMPLOYEE' || typeRaw === 'KARYAWAN') userType = 'EMPLOYEE';
          else if (typeRaw === 'LECTURER' || typeRaw === 'DOSEN') userType = 'LECTURER';
        }

        // Default password to NIP if exists, else a fixed string
        const plainPassword = nip ? nip.toString() : 'password123';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        await prisma.user.create({
          data: {
            email: email ? String(email) : undefined,
            name: name ? String(name) : undefined,
            nip: nip ? String(nip) : undefined,
            type: userType,
            password: hashedPassword,
          }
        });

        successCount++;
      } catch (err: any) {
        errors.push({ row: rowNumber, error: err.message || 'Unknown error' });
      }
    }

    return { successCount, skipCount, errors };
  }

  static async exportUsersToExcel() {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { email: true, name: true, nip: true, type: true }
    });

    const exportData = users.map(user => ({
      Email: user.email,
      Name: user.name || '',
      NIP: user.nip || '',
      Type: user.type || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
