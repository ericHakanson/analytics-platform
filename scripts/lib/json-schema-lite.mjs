function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isValidDateTime(value) {
  return !Number.isNaN(Date.parse(value));
}

function matchesType(type, value) {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'object':
      return isPlainObject(value);
    case 'string':
      return typeof value === 'string';
    default:
      return true;
  }
}

export function validateAgainstSchema(schema, value, valuePath = '$', errors = []) {
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${valuePath}: expected constant value ${JSON.stringify(schema.const)}`);
    return errors;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${valuePath}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`);
  }

  if (schema.type && !matchesType(schema.type, value)) {
    errors.push(`${valuePath}: expected type ${schema.type}`);
    return errors;
  }

  if (schema.type === 'object') {
    const properties = schema.properties || {};
    const required = schema.required || [];

    for (const key of required) {
      if (value[key] === undefined) {
        errors.push(`${valuePath}.${key}: missing required field`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          errors.push(`${valuePath}.${key}: additional property is not allowed`);
        }
      }
    }

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (value[key] !== undefined) {
        validateAgainstSchema(propertySchema, value[key], `${valuePath}.${key}`, errors);
      }
    }
  }

  if (schema.type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${valuePath}: expected at least ${schema.minItems} item(s)`);
    }

    if (schema.items) {
      value.forEach((item, index) => {
        validateAgainstSchema(schema.items, item, `${valuePath}[${index}]`, errors);
      });
    }
  }

  if (schema.type === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${valuePath}: expected minimum length ${schema.minLength}`);
    }

    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) {
      errors.push(`${valuePath}: does not match pattern ${schema.pattern}`);
    }

    if (schema.format === 'date' && !isValidDate(value)) {
      errors.push(`${valuePath}: expected ISO date`);
    }

    if (schema.format === 'date-time' && !isValidDateTime(value)) {
      errors.push(`${valuePath}: expected ISO date-time`);
    }
  }

  if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${valuePath}: expected minimum ${schema.minimum}`);
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${valuePath}: expected maximum ${schema.maximum}`);
    }
  }

  return errors;
}
