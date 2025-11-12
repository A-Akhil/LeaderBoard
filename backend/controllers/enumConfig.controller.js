const EnumConfig = require('../models/enumConfig.model');
const PointsConfig = require('../models/pointsConfig.model');
const Event = require('../models/event.model');
const Student = require('../models/student.model');
const mongoose = require('mongoose');
const FormFieldService = require('../services/formField.service');
const PointsCalculationService = require('../services/pointsCalculation.service');

/**
 * Get all enum configurations
 */
const getAllEnums = async (req, res) => {
  try {
    const enums = await EnumConfig.find();
    res.status(200).json({
      success: true,
      data: enums
    });
  } catch (error) {
    console.error('Error fetching enum configurations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get enum configuration by type
 */
const getEnumByType = async (req, res) => {
  try {
    const { type } = req.params;
    const enumConfig = await EnumConfig.findOne({ type });
    
    if (!enumConfig) {
      // Create default empty config if not found
      const defaultConfig = new EnumConfig({
        type,
        values: [],
        lastUpdated: Date.now(),
        updatedBy: req.admin?._id || null
      });

      try {
        await defaultConfig.save();

        return res.status(200).json({
          success: true,
          data: defaultConfig,
          message: `Created new empty ${type} configuration`
        });
      } catch (saveError) {
        if (saveError?.code === 11000) {
          const existing = await EnumConfig.findOne({ type });
          if (existing) {
            return res.status(200).json({
              success: true,
              data: existing,
              message: `Loaded existing ${type} configuration`
            });
          }
        }

        throw saveError;
      }
    }
    
    res.status(200).json({
      success: true,
      data: enumConfig
    });
  } catch (error) {
    console.error(`Error fetching enum configuration for ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update enum values
 */
const updateEnum = async (req, res) => {
  try {
    const { type } = req.params;
    const { values } = req.body;
    
    if (!values || !Array.isArray(values)) {
      return res.status(400).json({
        success: false,
        message: 'Values must be provided as an array'
      });
    }
    
    // Check for usage before removing values
    const existingConfig = await EnumConfig.findOne({ type });
    if (existingConfig) {
      const removedValues = existingConfig.values.filter(v => !values.includes(v));
      if (removedValues.length > 0) {
        // Check if any of the removed values are in use
        if (type === 'category') {
          const inUseCount = await Event.countDocuments({ category: { $in: removedValues } });
          if (inUseCount > 0) {
            return res.status(400).json({
              success: false,
              message: `Cannot remove values that are in use. ${inUseCount} events are using these categories.`
            });
          }
        }
        // Similar checks for other enum types
      }
    }
    
    // Update or create the enum configuration
    const updatedEnum = await EnumConfig.findOneAndUpdate(
      { type },
      { 
        values,
        lastUpdated: Date.now(),
        updatedBy: req.admin._id
      },
      { new: true, upsert: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedEnum,
      message: `${type} enum values updated successfully`
    });
  } catch (error) {
    console.error('Error updating enum configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get current points configuration
 */
const getPointsConfig = async (req, res) => {
  try {
    const config = await PointsConfig.getCurrentConfig();
    
    res.status(200).json({
      success: true,
      data: config || {}
    });
  } catch (error) {
    console.error('Error fetching points configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update points configuration
 */
const updatePointsConfig = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { configuration, configType = 'positionPoints', notes } = req.body;
    
    if (!configuration || typeof configuration !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Configuration must be provided as an object'
      });
    }
    
    // Get current configuration to compare
    const currentConfig = await PointsConfig.getCurrentConfig(configType);
    
    // Create new configuration
    const newConfig = new PointsConfig({
      configType,
      configuration,
      updatedBy: req.admin._id,
      notes,
      version: currentConfig ? currentConfig.version + 1 : 1
    });
    
    await newConfig.save({ session });
    
    // Mark previous configuration as inactive
    if (currentConfig) {
      await PointsConfig.updateMany(
        { configType, _id: { $ne: newConfig._id } },
        { isActive: false },
        { session }
      );
    }
    
    // If this is position points, recalculate event points
    if (configType === 'positionPoints') {
      console.log('Recalculating points based on new configuration...');
      
      // Process each position that has changed
      for (const [position, points] of Object.entries(configuration)) {
        // Skip if not changed
        if (currentConfig && currentConfig.configuration[position] === points) {
          continue;
        }
        
        // Find events with this position
        const events = await Event.find({
          positionSecured: position,
          status: 'Approved'
        }).session(session);
        
        console.log(`Found ${events.length} events with position ${position}`);
        
        // For each event, update points and adjust student totals
        for (const event of events) {
          const oldPoints = event.pointsEarned || 0;
          const newPoints = parseInt(points);
          const pointsDiff = newPoints - oldPoints;
          
          if (pointsDiff !== 0) {
            // Update only the pointsEarned field without triggering full validation
            await Event.findByIdAndUpdate(
              event._id,
              { pointsEarned: newPoints },
              { session, runValidators: false }
            );
            
            // Update student total points
            await Student.findByIdAndUpdate(
              event.submittedBy,
              { $inc: { totalPoints: pointsDiff } },
              { session }
            );
            
            console.log(`Updated event ${event._id}, student ${event.submittedBy}, points diff: ${pointsDiff}`);
          }
        }
      }
    }
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: newConfig,
      message: 'Points configuration updated successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating points configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get category-based rules configuration
 */
const getCategoryRules = async (req, res) => {
  try {
    const config = await PointsConfig.getCurrentConfig('categoryRules');
    
    // Get all available categories
    const categoryEnum = await EnumConfig.findOne({ type: 'category' });
    const availableCategories = categoryEnum ? categoryEnum.values : [];
    
    // Enhance response with available categories
    res.status(200).json({
      success: true,
      data: config || { configuration: {} },
      availableCategories
    });
  } catch (error) {
    console.error('Error fetching category rules:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update category-based rules configuration
 */
const updateCategoryRules = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { configuration, notes } = req.body;
    
    if (!configuration || typeof configuration !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Configuration must be provided as an object'
      });
    }
    
    // Get current configuration
    const currentConfig = await PointsConfig.getCurrentConfig('categoryRules');
    
    // Create new configuration
    const newConfig = new PointsConfig({
      configType: 'categoryRules',
      configuration,
      updatedBy: req.admin._id,
      notes,
      version: currentConfig ? currentConfig.version + 1 : 1
    });
    
    await newConfig.save({ session });
    
    // Mark previous configuration as inactive
    if (currentConfig) {
      await PointsConfig.updateMany(
        { configType: 'categoryRules', _id: { $ne: newConfig._id } },
        { isActive: false },
        { session }
      );
    }
    
    // Recalculate all approved events
    const events = await Event.find({ status: 'Approved' }).session(session);
    console.log(`Found ${events.length} approved events to recalculate`);
    
    for (const event of events) {
      // Calculate new points based on all factors
      const newPoints = await PointsCalculationService.calculatePoints(event);
      const oldPoints = event.pointsEarned || 0;
      const pointsDiff = newPoints - oldPoints;
      
      if (pointsDiff !== 0) {
        // Update event points
        await Event.findByIdAndUpdate(
          event._id,
          { pointsEarned: newPoints },
          { session, runValidators: false }
        );
        
        // Update student total points
        await Student.findByIdAndUpdate(
          event.submittedBy,
          { $inc: { totalPoints: pointsDiff } },
          { session }
        );
        
        console.log(`Updated event ${event._id}, points change: ${pointsDiff}`);
      }
    }
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: newConfig,
      message: 'Category rules updated successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating category rules:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get form field configuration for a category
 */
const getFormFieldConfig = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required'
      });
    }
    
    const formFields = await FormFieldService.getFieldsForCategory(category);
    
    res.status(200).json({
      success: true,
      data: formFields
    });
  } catch (error) {
    console.error('Error fetching form field configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update form field configuration
 */
const updateFormFieldConfig = async (req, res) => {
  try {
    const { category } = req.params;
    const { 
      requiredFields, 
      optionalFields, 
      conditionalFields,
      proofConfig,        // Added
      customQuestions     // Added
    } = req.body;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required'
      });
    }
    
    const updatedConfig = await FormFieldService.updateFieldsForCategory(
      category,
      { 
        requiredFields, 
        optionalFields, 
        conditionalFields,
        proofConfig,       // Added
        customQuestions    // Added  
      },
      req.admin._id
    );
    
    res.status(200).json({
      success: true,
      data: updatedConfig,
      message: 'Form field configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating form field configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllEnums,
  getEnumByType,
  updateEnum,
  getPointsConfig,
  updatePointsConfig,
  getCategoryRules,
  updateCategoryRules,
  getFormFieldConfig,
  updateFormFieldConfig
};