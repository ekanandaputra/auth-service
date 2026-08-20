import { prisma } from '../repositories/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';
import * as xlsx from 'xlsx';
import bcrypt from 'bcrypt';
import { UserType } from '@prisma/client';
import { createPaginatedResult, PaginatedResult } from '../utils/pagination';
import { hashPassword } from '../utils/password';

export class UserService {
  static async getUsers(page: number = 1, limit: number = 10, search?: string, roleKey?: string): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search && search.trim() !== '') {
      where.name = { contains: search.trim() };
    }
    if (roleKey && roleKey.trim() !== '') {
      const roleKeys = roleKey.split(',').map(k => k.trim()).filter(k => k !== '');
      if (roleKeys.length > 0) {
        where.roles = {
          some: {
            role: {
              key: {
                in: roleKeys
              }
            }
          }
        };
      }
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, nip: true, type: true, isActive: true, createdAt: true },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      })
    ]);

    return createPaginatedResult(users, total, { page, limit });
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        permissions: { include: { permission: true } },
        units: { include: { unit: true } }
      }
    });

    if (!user || user.deletedAt) throw new NotFoundError('User not found');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async getUserUnits(userId: string) {
    const userUnits = await prisma.userUnit.findMany({
      where: { userId },
      include: { unit: true }
    });
    return userUnits;
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

  static async updateUser(userId: string, data: { name?: string; nip?: string; type?: UserType; email?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundError('User not found');

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== user.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingEmail) throw new BadRequestError('Email already in use');
    }

    // Check NIP uniqueness if nip is being updated
    if (data.nip && data.nip !== user.nip) {
      const existingNip = await prisma.user.findUnique({ where: { nip: data.nip } });
      if (existingNip) throw new BadRequestError('NIP already in use');
    }

    // Validate type if provided
    if (data.type && !['EMPLOYEE', 'LECTURER'].includes(data.type)) {
      throw new BadRequestError('Type must be EMPLOYEE or LECTURER');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.nip !== undefined && { nip: data.nip }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.email !== undefined && { email: data.email }),
      },
      select: { id: true, email: true, name: true, nip: true, type: true, isActive: true, createdAt: true, updatedAt: true },
    });

    return updated;
  }

  static async resetPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundError('User not found');

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return true;
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

  static async importUserUnitsFromBuffer(buffer: Buffer) {
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
        let name = row.nama || row.Nama || row.NAMA || row.name || row.Name;
        let nip = row.nip || row.NIP;
        let unitName = row.unit || row.Unit || row.UNIT;

        if (name) name = String(name).trim();
        if (nip) nip = String(nip).replace(/['`]/g, '').trim();
        if (unitName) unitName = String(unitName).trim();

        if (!nip || !unitName) {
          errors.push({ row: rowNumber, error: 'Both NIP and UNIT are required' });
          continue;
        }

        // 1. Find or Create Unit
        let unit = await prisma.unit.findUnique({
          where: { name: unitName }
        });

        if (!unit) {
          unit = await prisma.unit.create({
            data: { name: unitName }
          });
        }

        // 2. Find or Create User
        let user = await prisma.user.findUnique({
          where: { nip: nip }
        });

        if (!user) {
          const plainPassword = nip;
          const hashedPassword = await bcrypt.hash(plainPassword, 10);
          
          user = await prisma.user.create({
            data: {
              nip: nip,
              name: name || nip, // Use provided name, fallback to NIP if empty
              password: hashedPassword,
            }
          });
        }

        // 3. Create UserUnit Relation
        const existingUserUnit = await prisma.userUnit.findUnique({
          where: {
            userId_unitId: {
              userId: user.id,
              unitId: unit.id
            }
          }
        });

        if (existingUserUnit) {
          skipCount++;
          continue;
        }

        await prisma.userUnit.create({
          data: {
            userId: user.id,
            unitId: unit.id,
            type: 'MEMBER'
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

  static async exportUserUnitsToExcel() {
    const userUnits = await prisma.userUnit.findMany({
      include: {
        user: { select: { nip: true, name: true } },
        unit: { select: { name: true } }
      }
    });

    const exportData = userUnits.map(uu => ({
      NAMA: uu.user.name || '',
      NIP: uu.user.nip || '',
      UNIT: uu.unit.name || ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'User Units');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
