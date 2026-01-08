import React, { useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import FormFieldsConfig from '../../components/admin/FormFieldsConfig';
import CategoryPointsConfig from '../../components/admin/CategoryPointsConfig';
import EnumConfigPage from './EnumConfigPage';

const ConfigManagement = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const tabs = [
    {
      label: 'Event Categories',
      component: (
        <EnumConfigPage
          allowedTypes={['category']}
          defaultType="category"
          title="Manage Event Categories"
          description="Create, reorder, or disable event categories. These values drive the dropdowns across dashboards and submission forms."
        />
      )
    },
    {
      label: 'Category Form Builder',
      component: <FormFieldsConfig />
    },
    {
      label: 'Category Points',
      component: <CategoryPointsConfig />
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Configuration</h1>
      <p className="text-gray-600 mb-6">
        Use these tools to manage event categories, the submission form experience, and scoring rules. Start with Event Categories to add or reorder options, then adjust the form fields and custom questions, and finally fine-tune the points awarded per category.
      </p>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          {tabs.map((tab, index) => (
            <Tab
              key={tab.label}
              label={tab.label}
              id={`config-tab-${index}`}
              aria-controls={`config-tabpanel-${index}`}
            />
          ))}
        </Tabs>
      </Box>

      <div className="mt-4">
        {tabs[activeTab]?.component}
      </div>
    </div>
  );
};

export default ConfigManagement;