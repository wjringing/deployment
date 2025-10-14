import React from 'react';
import { BookOpen, Lightbulb, CheckCircle2, AlertTriangle } from 'lucide-react';

const RuleBuilderHelp = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 text-white rounded-lg p-2">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rule Builder Guide</h2>
          <p className="text-sm text-gray-600">Everything you need to know about creating staffing rules</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            What are Staffing Rules?
          </h3>
          <p className="text-gray-700 leading-relaxed">
            Staffing rules automatically determine which positions need to be filled based on your restaurant's
            operational setup. For example, if you're using a two-lane drive-thru (DT2), you might need additional
            staff compared to a single-lane setup (DT1).
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Common Rule Examples
          </h3>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="font-semibold text-gray-900 mb-2">Example 1: Drive-Thru Presenter</p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>When:</strong> Drive-Thru Type is DT1<br />
                <strong>Then:</strong> Require 1 DT Presenter
              </p>
              <p className="text-xs text-gray-600 italic">
                This ensures you always have a presenter when using a single-lane drive-thru.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="font-semibold text-gray-900 mb-2">Example 2: Multiple Cooks on Busy Days</p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>When:</strong> Day of Week is Saturday<br />
                <strong>Then:</strong> Set Cook position to 3
              </p>
              <p className="text-xs text-gray-600 italic">
                This automatically increases cook count on your busiest day.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="font-semibold text-gray-900 mb-2">Example 3: Night Shift Requirements</p>
              <p className="text-sm text-gray-700 mb-2">
                <strong>When:</strong> Shift Type is Night Shift<br />
                <strong>Then:</strong> Require 1 Shift Runner
              </p>
              <p className="text-xs text-gray-600 italic">
                This ensures leadership is present during night operations.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Understanding Conditions</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-semibold text-gray-900">Drive-Thru Type</p>
                <p className="text-sm text-gray-600">
                  Choose DT1 (one lane), DT2 (two lanes), or None. This determines your drive-thru configuration.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-semibold text-gray-900">Number of Cooks</p>
                <p className="text-sm text-gray-600">
                  Set minimum, maximum, or exact number of cooks scheduled for the shift.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-semibold text-gray-900">Shift Type</p>
                <p className="text-sm text-gray-600">
                  Apply rules to Day Shift, Night Shift, or Both. Useful for shift-specific requirements.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <p className="font-semibold text-gray-900">Day of Week</p>
                <p className="text-sm text-gray-600">
                  Create rules that only apply on specific days (e.g., extra staff on weekends).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Understanding Actions</h3>
          <div className="space-y-3">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="font-semibold text-green-900 mb-2">Require a Position</p>
              <p className="text-sm text-gray-700">
                Makes sure a specific position is filled when conditions are met. You can specify how many people
                are needed for that position.
              </p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="font-semibold text-yellow-900 mb-2">Set Position Count</p>
              <p className="text-sm text-gray-700">
                Changes the number of people needed for a position. Use this to increase or decrease staffing
                for specific roles based on conditions.
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="font-semibold text-red-900 mb-2">Exclude a Position</p>
              <p className="text-sm text-gray-700">
                Prevents a position from being filled when conditions are met. Useful when certain positions
                aren't needed in specific situations.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-5 border border-yellow-300">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Important Tips
          </h3>
          <ul className="space-y-2 text-sm text-yellow-900">
            <li className="flex gap-2">
              <span className="text-yellow-600">•</span>
              <span>Rules are checked in priority order. Lower priority numbers are checked first.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-600">•</span>
              <span>All conditions in a rule must be true for the actions to take effect.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-600">•</span>
              <span>You can add multiple conditions and actions to create complex rules.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-600">•</span>
              <span>Inactive rules are saved but won't affect staffing assignments.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-600">•</span>
              <span>Test your rules after creating them to ensure they work as expected.</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-300">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need More Help?</h3>
          <p className="text-sm text-blue-800">
            Use the help button (?) in the rule builder for step-by-step guidance. You can also switch between
            Simple and Advanced modes using the toggle button. Simple mode is recommended for most users.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RuleBuilderHelp;
