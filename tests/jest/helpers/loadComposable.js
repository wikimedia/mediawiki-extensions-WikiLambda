/*!
 * WikiLambda unit test suite loadComposable helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { defineComponent } = require( 'vue' );

/**
 * Creates a test component that uses a composable
 *
 * @param {Function} composable - The composable function to test
 * @return {Array} [composableResult, wrapper] - Array containing composable result and Vue test utils wrapper
 */
function loadComposable( composable ) {
	let composableResult;
	const TestComponent = defineComponent( {
		name: 'test-component',
		template: '<div></div>',
		setup() {
			// Call the composable function and return its result
			composableResult = composable();
			return composableResult;
		}
	} );

	const wrapper = shallowMount( TestComponent );
	return [ composableResult, wrapper ];
}

module.exports = loadComposable;
