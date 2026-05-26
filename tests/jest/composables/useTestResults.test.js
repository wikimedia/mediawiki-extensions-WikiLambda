/*!
 * WikiLambda unit test suite for the useTestResults composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { ref } = require( 'vue' );
const loadComposable = require( '../helpers/loadComposable.js' );
const { createGettersWithFunctionsMock } = require( '../helpers/getterHelpers.js' );

const useTestResults = require( '../../../resources/ext.wikilambda.app/composables/useTestResults.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );

const functionZid = 'Z10000';
const testerZid = 'Z10001';
const implementationZid = 'Z10002';
const icons = {
	passed: 'icon-passed',
	failed: 'icon-failed',
	pending: 'icon-pending'
};

// NOTE: minimal and not strictly valid metadata to test the presence of absence of the pending key
const emptyMetadata = { Z1K1: 'Z883', K1: [ { Z1K1: 'Z882' } ] };
const someMetadata = { Z1K1: 'Z883', K1: [ { Z1K1: 'Z882' }, { Z1K2: 'Z882', K1: 'someData', K2: 'woho!' } ] };
const pendingMetadata = { Z1K1: 'Z883', K1: [ { Z1K1: 'Z882' }, { Z1K2: 'Z882', K1: 'pending', K2: 'Z41' } ] };

describe( 'useTestResults', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getZTesterResult = createGettersWithFunctionsMock( undefined );
		store.getZTesterMetadata = createGettersWithFunctionsMock( undefined );
	} );

	const loadTestResults = ( fetching = false ) => {
		const [ result ] = loadComposable( () => useTestResults( {
			functionZid: ref( functionZid ),
			testerZid: ref( testerZid ),
			implementationZid: ref( implementationZid ),
			fetching: ref( fetching ),
			icons
		} ) );
		return result;
	};

	describe( 'testResult', () => {
		it( 'returns undefined when no result is stored', () => {
			const { testResult } = loadTestResults();
			expect( testResult.value ).toBeUndefined();
		} );

		it( 'returns true when test passed', () => {
			store.getZTesterResult = createGettersWithFunctionsMock( true );
			const { testResult } = loadTestResults();
			expect( testResult.value ).toBe( true );
		} );

		it( 'returns false when test failed', () => {
			store.getZTesterResult = createGettersWithFunctionsMock( false );
			const { testResult } = loadTestResults();
			expect( testResult.value ).toBe( false );
		} );
	} );

	describe( 'isPending', () => {
		it( 'returns false when there is no stored metadata for the test', () => {
			const { isPending } = loadTestResults();
			expect( isPending.value ).toBe( false );
		} );

		it( 'returns false with void metadata', () => {
			store.getZTesterMetadata = createGettersWithFunctionsMock( 'Z24' );
			const { isPending } = loadTestResults();
			expect( isPending.value ).toBe( false );
		} );

		it( 'returns false when metadata map is empty', () => {
			store.getZTesterMetadata = createGettersWithFunctionsMock( emptyMetadata );
			const { isPending } = loadTestResults();
			expect( isPending.value ).toBe( false );
		} );

		it( 'returns false when metadata map has no pending key', () => {
			store.getZTesterMetadata = createGettersWithFunctionsMock( someMetadata );
			const { isPending } = loadTestResults();
			expect( isPending.value ).toBe( false );
		} );

		it( 'returns true when metadata map has a pending key', () => {
			store.getZTesterMetadata = createGettersWithFunctionsMock( pendingMetadata );
			const { isPending } = loadTestResults();
			expect( isPending.value ).toBe( true );
		} );
	} );

	describe( 'hasMetadata', () => {
		it( 'returns false when result is undefined', () => {
			const { hasMetadata } = loadTestResults();
			expect( hasMetadata.value ).toBe( false );
		} );

		it( 'returns false when there is metadata but has a pending key', () => {
			store.getZTesterResult = createGettersWithFunctionsMock( false );
			store.getZTesterMetadata = createGettersWithFunctionsMock( pendingMetadata );
			const { hasMetadata } = loadTestResults();
			expect( hasMetadata.value ).toBe( false );
		} );

		it( 'returns true when there is metadata we want to show (other keys, not pending)', () => {
			store.getZTesterResult = createGettersWithFunctionsMock( true );
			store.getZTesterMetadata = createGettersWithFunctionsMock( someMetadata );
			const { hasMetadata } = loadTestResults();
			expect( hasMetadata.value ).toBe( true );
		} );
	} );

	describe( 'statusFlag, statusMessage, statusIcon', () => {
		it( 'returns RUNNING when theres a flying promise (fetching prop is true)', () => {
			const {
				statusFlag,
				statusMessage,
				statusIcon
			} = loadTestResults( true );

			expect( statusFlag.value ).toBe( Constants.TESTER_STATUS.RUNNING );
			expect( statusMessage.value ).toBe( 'Running…' );
			// Running, Pending and Ready share same icon
			expect( statusIcon.value ).toBe( icons.pending );
		} );

		it( 'returns READY when result is not available nor on the way', () => {
			const {
				statusFlag,
				statusMessage,
				statusIcon
			} = loadTestResults();

			expect( statusFlag.value ).toBe( Constants.TESTER_STATUS.READY );
			expect( statusMessage.value ).toBe( 'Ready' );
			// Running, Pending and Ready share same icon
			expect( statusIcon.value ).toBe( icons.pending );
		} );

		it( 'returns PENDING when result has come back with a pending metadata key', () => {
			store.getZTesterResult = createGettersWithFunctionsMock( false );
			store.getZTesterMetadata = createGettersWithFunctionsMock( pendingMetadata );
			const {
				statusFlag,
				statusMessage,
				statusIcon
			} = loadTestResults();

			expect( statusFlag.value ).toBe( Constants.TESTER_STATUS.PENDING );
			expect( statusMessage.value ).toBe( 'Pending' );
			expect( statusIcon.value ).toBe( icons.pending );
		} );

		it( 'returns PASSED when test result is available and passed', () => {
			store.getZTesterResult = createGettersWithFunctionsMock( true );
			const {
				statusFlag,
				statusMessage,
				statusIcon
			} = loadTestResults();

			expect( statusFlag.value ).toBe( Constants.TESTER_STATUS.PASSED );
			expect( statusMessage.value ).toBe( 'Passed' );
			expect( statusIcon.value ).toBe( icons.passed );
		} );

		it( 'returns FAILED when test result is available but failed', () => {
			store.getZTesterResult = createGettersWithFunctionsMock( false );
			const {
				statusFlag,
				statusMessage,
				statusIcon
			} = loadTestResults();

			expect( statusFlag.value ).toBe( Constants.TESTER_STATUS.FAILED );
			expect( statusMessage.value ).toBe( 'Failed' );
			expect( statusIcon.value ).toBe( icons.failed );
		} );

		it( 'returns API_ERROR when test call threw an Api Error', () => {
			store.getZTesterResult = createGettersWithFunctionsMock();
			store.getErrors = createGettersWithFunctionsMock( [ { some: 'error' } ] );
			const {
				statusFlag,
				statusMessage,
				statusIcon
			} = loadTestResults();

			expect( statusFlag.value ).toBe( Constants.TESTER_STATUS.API_ERROR );
			expect( statusMessage.value ).toBe( 'Error' );
			expect( statusIcon.value ).toBe( icons.failed );
		} );
	} );
} );
