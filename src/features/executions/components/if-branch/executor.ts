import type { NodeExecutor } from '@/features/executions/types';
import { NonRetriableError } from 'inngest';
import { ifBranchChannel } from '@/inngest/channels/if-branch';
import Handlebars from 'handlebars';

type IfBranchData = {
  variable?: string;
  operator?: string;
  value?: string;
};

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const value = Handlebars.compile(path)(obj);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const evaluateCondition = (operator: string, left: unknown, right: unknown): boolean => {
  const leftStr = String(left ?? '');
  const rightStr = String(right ?? '');
  const leftNum = Number(left);
  const rightNum = Number(right);

  switch (operator) {
    case 'equals':
      return left === right || leftStr === rightStr;
    case 'notEquals':
      return left !== right && leftStr !== rightStr;
    case 'greaterThan':
      return !isNaN(leftNum) && !isNaN(rightNum) && leftNum > rightNum;
    case 'lessThan':
      return !isNaN(leftNum) && !isNaN(rightNum) && leftNum < rightNum;
    case 'greaterThanOrEqual':
      return !isNaN(leftNum) && !isNaN(rightNum) && leftNum >= rightNum;
    case 'lessThanOrEqual':
      return !isNaN(leftNum) && !isNaN(rightNum) && leftNum <= rightNum;
    case 'contains':
      return leftStr.includes(rightStr);
    case 'notContains':
      return !leftStr.includes(rightStr);
    case 'isEmpty':
      return left === null || left === undefined || leftStr === '';
    case 'isNotEmpty':
      return left !== null && left !== undefined && leftStr !== '';
    case 'matches':
      try {
        return new RegExp(rightStr).test(leftStr);
      } catch {
        return false;
      }
    default:
      return false;
  }
};

export const ifBranchExecutor: NodeExecutor<IfBranchData> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(
    ifBranchChannel().status({
      nodeId,
      status: 'loading',
    }),
  );

  try {
    if (!data.variable) {
      throw new NonRetriableError('If-Branch: No variable configured');
    }

    const variableValue = getNestedValue(context as Record<string, unknown>, data.variable);
    const conditionValue = data.value !== undefined ? data.value : '';
    const result = evaluateCondition(data.operator || 'equals', variableValue, conditionValue);

    await publish(
      ifBranchChannel().status({
        nodeId,
        status: 'success',
        result,
      }),
    );

    return {
      ...context,
      [`${nodeId}_condition`]: result,
    };
  } catch (error) {
    await publish(
      ifBranchChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw error;
  }
};
