import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) { }

  // generateResetLink moved to UsersService

  async loginWithMagicLink(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        // resetTokenExpiry: { gt: new Date() } // Optional: enforce expiry
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Clear token, but keep forceChangePassword = true (it was set during generation)
    // Actually, we enforce logic: if they login via token, they MUST change password.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: null,
        resetTokenExpiry: null,
        forceChangePassword: true,
      },
    });

    // Generate JWT
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.firstName || 'User',
        role: user.role,
        currency: user.currency,
        forceChangePassword: true,
      },
    };
  }

  /**
   * Updates a user's password after verifying the current password.
   * Requires current password for security.
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!userId) {
      throw new UnauthorizedException('User ID is required for password update');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify current password
    if (!user.passwordHash) {
      throw new BadRequestException('User does not have a password set');
    }

    try {
      const isCurrentPasswordValid = await argon2.verify(user.passwordHash, currentPassword);

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Ensure new password is different from current
      if (currentPassword === newPassword) {
        throw new BadRequestException('New password must be different from current password');
      }

      // Hash and update new password
      const hash = await argon2.hash(newPassword);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hash,
          password: null,
          forceChangePassword: false,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      // Re-throw our custom exceptions
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      // For unexpected errors
      throw new BadRequestException('Failed to update password. Please ensure requirements are met.');
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    console.log(`[AuthService] Validating user: ${email}`);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.log(`[AuthService] User not found: ${email}`);
      return null;
    }
    console.log(`[AuthService] User found: ${user.id} (${user.email})`);

    // Check if user is active
    if (user.isActive === false || user.isDeleted === true) {
      console.log(`[AuthService] User is inactive or deleted: ${user.id}`);
      return null;
    }

    // Check if account is locked out
    if (user.isDisabled) {
      console.log(`[AuthService] User account is disabled: ${user.id}`);
      throw new UnauthorizedException('Account disabled. Please contact support.');
    }

    // For real DB users with argon2 hashed passwords
    if (user.passwordHash) {
      try {
        console.log(`[AuthService] Verifying password with argon2 for user: ${user.id}`);
        const isValid = await argon2.verify(user.passwordHash, pass);
        console.log(`[AuthService] Password verification result for ${user.id}: ${isValid}`);

        if (isValid) {
          // Reset failed attempts on success
          if (user.failedLoginAttempts > 0) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: 0 },
            });
          }
          const { passwordHash, ...result } = user as any;
          return result;
        } else {
          // Increment failed attempts
          const newAttempts = (user.failedLoginAttempts || 0) + 1;
          const isNowDisabled = newAttempts >= 5;
          await this.prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts,
              isDisabled: isNowDisabled
            },
          });

          if (isNowDisabled) {
            throw new UnauthorizedException('Account disabled due to too many failed attempts.');
          }
          return null;
        }
      } catch (e) {
        if (e instanceof UnauthorizedException) throw e;
        console.error(`[AuthService] Argon2 verification failed for user ${user.id}:`, e);
        return null;
      }
    }

    return null;
  }

  async login(loginDto: LoginDto) {
    console.log(`[AuthService] Login attempt for: ${loginDto.email}`);
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      console.log(`[AuthService] Login failed - invalid credentials or user inactive: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log(`[AuthService] Login successful for: ${user.id}`);
    const payload = { email: user.email, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);
    console.log(`[AuthService] Generated token for ${user.email} with payload:`, payload);
    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.firstName || 'User',
      role: user.role,
      currency: user.currency,
      forceChangePassword: user.forceChangePassword,
      moduleVisibility: typeof user.moduleVisibility === 'string'
        ? JSON.parse(user.moduleVisibility)
        : user.moduleVisibility,
    };
    console.log(`[AuthService] Returning user with moduleVisibility (${typeof responseUser.moduleVisibility}):`, JSON.stringify(responseUser.moduleVisibility));
    return {
      access_token: token,
      user: responseUser,
    };
  }
  async validateGoogleUser(details: any) {
    console.log('AuthService: validateGoogleUser', details);
    const { email, firstName, lastName, picture, accessToken } = details;
    const user = await this.prisma.user.findFirst({ where: { email } });

    if (user) {
      // Update google info if needed
      return user;
    }

    console.log('AuthService: Creating new user from Google');
    const newUser = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        avatarUrl: picture,
        role: 'USER',
        googleId: details.id, // Assuming schema supports it, or we just rely on email
        // passwordHash: '', // Social users might not have password
        currency: 'AED',
      },
    });

    return newUser;
  }

  async signup(signupDto: any) {
    console.log(`[AuthService] Signup attempt for: ${signupDto.email}`);

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: signupDto.email }
    });

    if (existingUser) {
      console.log(`[AuthService] Signup failed - email already exists: ${signupDto.email}`);
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await argon2.hash(signupDto.password);

    // Create new user
    const newUser = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        passwordHash,
        firstName: signupDto.firstName || null,
        lastName: signupDto.lastName || null,
        role: 'USER',
        currency: 'AED', // Default currency
        isActive: true,
        forceChangePassword: false,
      },
    });

    console.log(`[AuthService] Signup successful for: ${newUser.id}`);

    // Generate JWT token
    const payload = { email: newUser.email, sub: newUser.id, role: newUser.role };
    const token = this.jwtService.sign(payload);

    const responseUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.firstName || 'User',
      role: newUser.role,
      currency: newUser.currency,
      forceChangePassword: newUser.forceChangePassword,
    };

    return {
      access_token: token,
      user: responseUser,
    };
  }
}
