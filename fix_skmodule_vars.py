import re

with open('src/components/modules/SKModule.tsx', 'r') as f:
    content = f.read()

variables_to_insert = """
  const selectedCase = store.cases?.find(c => c.id === caseId);
  const selectedPersonnel = store.personnel?.find(p => p.id === personnelId);
  const isPerorangan = selectedCase?.clientType === 'PERORANGAN';
  const skNumberDraft = isEditing ? ((store.sks || store.sk || []).find((s: any) => s.id === editId)?.skNumber || '') : `SK/ARMS/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
"""

# Insert before handleAddAttachment
content = content.replace(
    "  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {",
    variables_to_insert + "\n  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {"
)

with open('src/components/modules/SKModule.tsx', 'w') as f:
    f.write(content)
