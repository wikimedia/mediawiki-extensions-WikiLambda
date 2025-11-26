/*!
 * Mock for mediawiki.DateFormatter for Jest tests
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/**
 * Mock implementation of DateFormatter class for testing.
 * Simple mock that returns a predictable value based on the date difference.
 * We assume DateFormatter works correctly - we're testing our code, not DateFormatter.
 */
class DateFormatter {
	/**
	 * Format a Date as relative time.
	 * Simple mock that calculates minutes difference for predictable test output.
	 *
	 * @param {Date} date
	 * @return {string}
	 */
	static formatRelativeTimeOrDate( date ) {
		if ( !( date instanceof Date ) || isNaN( date.getTime() ) ) {
			return 'invalid date';
		}
		// Return a fixed value for predictable test output
		return '4 minutes ago';
	}
}

module.exports = DateFormatter;
