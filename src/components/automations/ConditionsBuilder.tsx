import React from 'react';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';

interface ConditionField {
  field: string;
  label: string;
  type: 'STRING' | 'NUMBER' | 'ENUM';
  operators: string[];
  options?: string[];
}

interface Condition {
  field: string;
  operator: string;
  value: string | number | null;
}

interface ConditionsBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  fieldsMetadata: ConditionField[];
}

export default function ConditionsBuilder({
  conditions,
  onChange,
  fieldsMetadata,
}: ConditionsBuilderProps) {
  // Backward compatibility normalization for legacy COMPLETED values on task.status
  React.useEffect(() => {
    let normalized = false;
    const nextConditions = conditions.map((c) => {
      if (c.field === 'task.status' && c.value === 'COMPLETED') {
        normalized = true;
        return { ...c, value: 'DONE' };
      }
      return c;
    });

    if (normalized) {
      onChange(nextConditions);
    }
  }, [conditions, onChange]);

  const handleAddRow = () => {
    const defaultField = fieldsMetadata[0]?.field || '';
    const fieldDef = fieldsMetadata.find((f) => f.field === defaultField);
    const defaultOperator = fieldDef?.operators[0] || 'EQUALS';
    
    onChange([
      ...conditions,
      { field: defaultField, operator: defaultOperator, value: '' },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    onChange(conditions.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, updatedRow: Partial<Condition>) => {
    const updated = conditions.map((row, idx) => {
      if (idx === index) {
        const nextRow = { ...row, ...updatedRow };
        
        // If the field changes, reset operator and value to be compatible with new field definition
        if (updatedRow.field) {
          const fieldDef = fieldsMetadata.find((f) => f.field === updatedRow.field);
          nextRow.operator = fieldDef?.operators[0] || 'EQUALS';
          nextRow.value = '';
        }
        
        // If the operator changes to empty checks, clean the value field
        if (nextRow.operator === 'IS_EMPTY' || nextRow.operator === 'IS_NOT_EMPTY') {
          nextRow.value = null;
        } else if (updatedRow.operator && nextRow.value === null) {
          // If moving back to a non-empty operator from an empty operator, set default value
          nextRow.value = '';
        }
        
        return nextRow;
      }
      return row;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          AND Matching Criteria
        </label>
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1 px-2.5 rounded-lg border border-indigo-500/15 bg-indigo-500/5 cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>Add Condition</span>
        </button>
      </div>

      {conditions.length === 0 ? (
        <div className="flex items-center gap-2 border border-border bg-muted/5 p-4 rounded-xl text-center justify-center text-xs text-muted-foreground select-none font-medium leading-relaxed">
          <ShieldAlert className="h-4 w-4 text-slate-400" />
          <span>No rules criteria defined. This rule will trigger on every event.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((row, index) => {
            const fieldDef = fieldsMetadata.find((f) => f.field === row.field);
            const operators = fieldDef?.operators || ['EQUALS'];
            const isNoValueRequired = row.operator === 'IS_EMPTY' || row.operator === 'IS_NOT_EMPTY';
            const isNumberField = fieldDef?.type === 'NUMBER' || row.field === 'deal.value';
            const isDropdown = fieldDef?.type === 'ENUM' && Array.isArray(fieldDef.options);
            const optionsList = fieldDef?.options || [];

            return (
              <div key={index} className="flex gap-2.5 items-center animate-in fade-in duration-100">
                {/* Field Selection */}
                <select
                  value={row.field}
                  onChange={(e) => handleRowChange(index, { field: e.target.value })}
                  className="rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer flex-1"
                >
                  {fieldsMetadata.map((f) => (
                    <option key={f.field} value={f.field}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {/* Operator Selection */}
                <select
                  value={row.operator}
                  onChange={(e) => handleRowChange(index, { operator: e.target.value })}
                  className="rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer w-40"
                >
                  {operators.map((op) => (
                    <option key={op} value={op}>
                      {op.replace('_', ' ')}
                    </option>
                  ))}
                </select>

                {/* Value Input (Hidden for Empty/Not-Empty checks) */}
                {!isNoValueRequired && (
                  isDropdown ? (
                    <select
                      value={row.value !== null && row.value !== undefined ? row.value : ''}
                      onChange={(e) => handleRowChange(index, { value: e.target.value })}
                      required
                      className="rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer w-48"
                    >
                      <option value="" disabled>Select option</option>
                      {optionsList.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={isNumberField ? 'number' : 'text'}
                      required
                      value={row.value !== null && row.value !== undefined ? row.value : ''}
                      onChange={(e) =>
                        handleRowChange(index, {
                          value: isNumberField ? (e.target.value === '' ? '' : parseFloat(e.target.value) || 0) : e.target.value,
                        })
                      }
                      placeholder={isNumberField ? '0.00' : 'Value'}
                      className="rounded-xl border border-border bg-secondary/30 py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 transition-all w-48"
                    />
                  )
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleRemoveRow(index)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                  title="Remove Condition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
