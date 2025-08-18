import { z } from "zod";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export function validateSessionBooking(data: any): ValidationResult<{
  humanMentorId: number;
  scheduledDate: Date;
  duration: number;
  sessionGoals: string;
}> {
  try {
    const schema = z.object({
      humanMentorId: z.union([
        z.number().int().positive(),
        z.string().transform(str => {
          const num = parseInt(str, 10);
          if (isNaN(num) || num <= 0) throw new Error('Invalid mentor ID');
          return num;
        })
      ]),
      scheduledDate: z.string().min(1).transform(str => {
        if (typeof str !== 'string') {
          throw new Error('scheduledDate must be a string');
        }
        const date = new Date(str);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date format: ${str}`);
        }
        return date;
      }),
      duration: z.number().int().min(30).max(180),
      sessionGoals: z.string().min(10).max(500),
    });

    const result = schema.safeParse(data);

    if (!result.success) {
      console.log('Validation failed:', result.error.issues);
      return {
        success: false,
        errors: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('Validation internal error:', error);
    return {
      success: false,
      errors: [{
        field: 'internal',
        message: error instanceof Error ? error.message : String(error)
      }]
    };
  }
}

export function validateCouncilBooking(data: any): ValidationResult<{
  selectedMentors: number[];
  preferredDate: Date;
  sessionGoals: string;
}> {
  const errors: ValidationError[] = [];

  // Validate selectedMentors
  if (!data.selectedMentors || !Array.isArray(data.selectedMentors)) {
    errors.push({
      field: 'selectedMentors',
      message: 'selectedMentors must be an array'
    });
  } else {
    const mentorIds = data.selectedMentors.map(Number).filter(id => Number.isInteger(id) && id > 0);
    if (mentorIds.length < 3 || mentorIds.length > 5) {
      errors.push({
        field: 'selectedMentors',
        message: 'selectedMentors must contain 3-5 valid mentor IDs'
      });
    }
  }

  // Validate sessionGoals
  if (!data.sessionGoals || typeof data.sessionGoals !== 'string' || data.sessionGoals.trim().length < 10) {
    errors.push({
      field: 'sessionGoals',
      message: 'sessionGoals must be at least 10 characters long'
    });
  }

  // Validate preferredDate
  let parsedDate: Date;
  try {
    if (!data.preferredDate) {
      throw new Error('preferredDate is required');
    }

    parsedDate = new Date(data.preferredDate);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Ensure date is in the future
    if (parsedDate <= new Date()) {
      throw new Error('Date must be in the future');
    }
  } catch (dateError) {
    errors.push({
      field: 'preferredDate',
      message: dateError instanceof Error ? dateError.message : 'Invalid date'
    });
    parsedDate = new Date(); // fallback
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      selectedMentors: data.selectedMentors.map(Number),
      preferredDate: parsedDate!,
      sessionGoals: data.sessionGoals.trim()
    }
  };
}

export const parseSessionBookingId = (id: any) => {
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    return {
      field: 'id',
      message: 'ID must be a positive integer'
    };
  }
  return null;
};