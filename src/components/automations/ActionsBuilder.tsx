import React from 'react';
import { Plus, Trash2, ArrowDown } from 'lucide-react';

interface FieldOption {
  value: string;
  label: string;
}

interface ActionField {
  name: string;
  label: string;
  type: 'TEMPLATE_STRING' | 'NUMBER' | 'SELECT' | 'SELECT_WITH_DYNAMIC' | 'SELECT_WITH_DYNAMIC_AND_INPUT';
  options?: Array<string | FieldOption>;
  required: boolean;
  defaultValue?: any;
}

interface ActionType {
  value: string;
  label: string;
  fields: ActionField[];
}

interface Action {
  actionType: string;
  configurationJson: Record<string, any>;
}

interface ActionsBuilderProps {
  actions: Action[];
  onChange: (actions: Action[]) => void;
  actionTypesMetadata: ActionType[];
  organizationUsers?: Array<{ id: string; name: string; email: string }>;
}

export default function ActionsBuilder({
  actions,
  onChange,
  actionTypesMetadata,
  organizationUsers,
}: ActionsBuilderProps) {
  const renderSelectOptions = (f: ActionField) => {
    if (f.name === 'assigneeId' || f.name === 'userId' || f.name === 'to') {
      const dynamicOptions = f.options || [];
      return (
        <>
          <optgroup label="Dynamic Recipients">
            {dynamicOptions.map((opt) => {
              const valStr = typeof opt === 'object' ? opt.value : opt;
              const lblStr = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={valStr} value={valStr}>
                  {lblStr}
                </option>
              );
            })}
          </optgroup>
          {organizationUsers && organizationUsers.length > 0 && (
            <optgroup label="Organization Members">
              {organizationUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </optgroup>
          )}
        </>
      );
    }

    return f.options?.map((opt) => {
      const valStr = typeof opt === 'object' ? opt.value : opt;
      const lblStr = typeof opt === 'object' ? opt.label : opt;
      return (
        <option key={valStr} value={valStr}>
          {lblStr}
        </option>
      );
    });
  };

  const handleAddAction = () => {
    const defaultType = actionTypesMetadata[0]?.value || '';
    const config: Record<string, any> = {};
    
    // Populate default values
    const typeDef = actionTypesMetadata.find((t) => t.value === defaultType);
    typeDef?.fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        config[f.name] = f.defaultValue;
      } else if (f.type === 'SELECT_WITH_DYNAMIC' || f.type === 'SELECT_WITH_DYNAMIC_AND_INPUT') {
        const firstOpt = f.options?.[0];
        config[f.name] = typeof firstOpt === 'object' ? firstOpt.value : firstOpt || '';
      } else {
        config[f.name] = '';
      }
    });

    onChange([
      ...actions,
      { actionType: defaultType, configurationJson: config },
    ]);
  };

  const handleRemoveAction = (index: number) => {
    onChange(actions.filter((_, idx) => idx !== index));
  };

  const handleActionTypeChange = (index: number, newType: string) => {
    const typeDef = actionTypesMetadata.find((t) => t.value === newType);
    const config: Record<string, any> = {};
    
    typeDef?.fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        config[f.name] = f.defaultValue;
      } else if (f.type === 'SELECT_WITH_DYNAMIC' || f.type === 'SELECT_WITH_DYNAMIC_AND_INPUT') {
        const firstOpt = f.options?.[0];
        config[f.name] = typeof firstOpt === 'object' ? firstOpt.value : firstOpt || '';
      } else {
        config[f.name] = '';
      }
    });

    onChange(
      actions.map((act, idx) =>
        idx === index ? { actionType: newType, configurationJson: config } : act
      )
    );
  };

  const handleFieldChange = (index: number, fieldName: string, val: any) => {
    onChange(
      actions.map((act, idx) => {
        if (idx === index) {
          return {
            ...act,
            configurationJson: {
              ...act.configurationJson,
              [fieldName]: val,
            },
          };
        }
        return act;
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Workflow Action Steps
        </label>
        <button
          type="button"
          onClick={handleAddAction}
          className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors py-1 px-2.5 rounded-lg border border-indigo-500/15 bg-indigo-500/5 cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>Add Action</span>
        </button>
      </div>

      {actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border/80 rounded-2xl text-center text-xs text-muted-foreground/60 select-none">
          No workflow action steps defined yet. At least one action is required.
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((act, index) => {
            const currentTypeDef = actionTypesMetadata.find((t) => t.value === act.actionType);
            const fields = currentTypeDef?.fields || [];

            return (
              <div key={index} className="relative space-y-4">
                {/* Arrow indicator between sequenced cards */}
                {index > 0 && (
                  <div className="flex justify-center -my-2">
                    <ArrowDown className="h-4 w-4 text-indigo-500/50" />
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4 relative group hover:border-border/80 transition-all">
                  {/* Delete Action Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveAction(index)}
                    className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Remove Action Step"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Action Type Selector */}
                  <div className="space-y-1 pr-8">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      Step {index + 1}: Action Type
                    </label>
                    <select
                      value={act.actionType}
                      onChange={(e) => handleActionTypeChange(index, e.target.value)}
                      className="rounded-xl border border-border bg-secondary/35 py-2.5 px-3 text-xs font-bold text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer w-full sm:max-w-xs"
                    >
                      {actionTypesMetadata.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Render Configuration Fields dynamically */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                    {fields.map((f) => {
                      const value = act.configurationJson[f.name] ?? '';
                      const isFullWidth = f.name === 'description' || f.name === 'body' || f.name === 'message';
                      const isDropdownOption = f.options?.some(
                        (opt) => (typeof opt === 'object' ? opt.value : opt) === value
                      ) || organizationUsers?.some(u => u.id === value);

                      return (
                        <div
                          key={f.name}
                          className={`space-y-1 ${isFullWidth ? 'sm:col-span-2' : ''}`}
                        >
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            {f.label} {f.required && <span className="text-rose-400">*</span>}
                          </label>

                          {/* 1. TEMPLATE_STRING Text Field vs Textarea */}
                          {f.type === 'TEMPLATE_STRING' ? (
                            isFullWidth ? (
                              <textarea
                                required={f.required}
                                rows={3}
                                value={value}
                                onChange={(e) => handleFieldChange(index, f.name, e.target.value)}
                                placeholder={`Enter ${f.label.toLowerCase()} content (supports template tokens)`}
                                className="w-full rounded-xl border border-border bg-secondary/20 py-2 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 transition-all leading-relaxed"
                              />
                            ) : (
                              <input
                                type="text"
                                required={f.required}
                                value={value}
                                onChange={(e) => handleFieldChange(index, f.name, e.target.value)}
                                placeholder={`Enter ${f.label.toLowerCase()}`}
                                className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 transition-all"
                              />
                            )
                          ) : null}

                          {/* 2. NUMBER field */}
                          {f.type === 'NUMBER' ? (
                            <input
                              type="number"
                              required={f.required}
                              min={0}
                              value={value}
                              onChange={(e) =>
                                handleFieldChange(index, f.name, parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 transition-all"
                            />
                          ) : null}

                          {/* 3. SELECT option lists */}
                          {f.type === 'SELECT' ? (
                            <select
                              required={f.required}
                              value={value}
                              onChange={(e) => handleFieldChange(index, f.name, e.target.value)}
                              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                            >
                              {renderSelectOptions(f)}
                            </select>
                          ) : null}

                          {/* 4. SELECT_WITH_DYNAMIC lists */}
                          {f.type === 'SELECT_WITH_DYNAMIC' ? (
                            <select
                              required={f.required}
                              value={value}
                              onChange={(e) => handleFieldChange(index, f.name, e.target.value)}
                              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
                            >
                              {renderSelectOptions(f)}
                            </select>
                          ) : null}

                          {/* 5. SELECT_WITH_DYNAMIC_AND_INPUT Hybrid Combobox */}
                          {f.type === 'SELECT_WITH_DYNAMIC_AND_INPUT' ? (
                            <div className="flex gap-2">
                              {/* Option selection */}
                              <select
                                value={isDropdownOption ? value : 'CUSTOM'}
                                onChange={(e) => {
                                  const selectVal = e.target.value;
                                  if (selectVal !== 'CUSTOM') {
                                    handleFieldChange(index, f.name, selectVal);
                                  } else {
                                    handleFieldChange(index, f.name, '');
                                  }
                                }}
                                className="rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-foreground outline-none focus:border-indigo-500/50 transition-all cursor-pointer w-44"
                              >
                                {renderSelectOptions(f)}
                                <option value="CUSTOM">Custom Address...</option>
                              </select>

                              {/* Custom input string if option selected is custom */}
                              {!isDropdownOption || value === '' ? (
                                <input
                                  type="text"
                                  required={f.required}
                                  value={isDropdownOption ? '' : value}
                                  onChange={(e) =>
                                    handleFieldChange(index, f.name, e.target.value)
                                  }
                                  placeholder="Enter custom email address"
                                  className="flex-1 rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500/50 transition-all"
                                />
                              ) : (
                                <div className="flex-1 py-2.5 px-3 bg-secondary/10 border border-border/30 rounded-xl text-xs text-muted-foreground/60 select-none">
                                  Resolved dynamically
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
