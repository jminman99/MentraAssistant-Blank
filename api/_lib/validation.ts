
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
  const errors: ValidationError[] = [];
  
  // Validate humanMentorId
  const mentorIdNum = Number(data.humanMentorId);
  if (!data.humanMentorId || !Number.isInteger(mentorIdNum) || mentorIdNum <= 0) {
    errors.push({
      field: 'humanMentorId',
      message: 'humanMentorId must be a positive integer'
    });
  }

  // Validate duration
  const durationNum = Number(data.duration);
  if (!data.duration || !Number.isInteger(durationNum) || durationNum <= 0 || durationNum > 180) {
    errors.push({
      field: 'duration',
      message: 'duration must be a positive integer between 1 and 180 minutes'
    });
  }

  // Validate sessionGoals
  if (!data.sessionGoals || typeof data.sessionGoals !== 'string' || data.sessionGoals.trim().length < 10) {
    errors.push({
      field: 'sessionGoals',
      message: 'sessionGoals must be at least 10 characters long'
    });
  }

  // Validate scheduledDate
  let parsedDate: Date;
  try {
    if (!data.scheduledDate) {
      throw new Error('scheduledDate is required');
    }
    
    parsedDate = new Date(data.scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Ensure date is in the future
    if (parsedDate <= new Date()) {
      throw new Error('Date must be in the future');
    }
  } catch (dateError) {
    errors.push({
      field: 'scheduledDate',
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
      humanMentorId: mentorIdNum,
      scheduledDate: parsedDate!,
      duration: durationNum,
      sessionGoals: data.sessionGoals.trim()
    }
  };
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
