/*!
 * WikiLambda unit test suite for the VisualEditor ContentEditable function call node.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

describe( 've.ce.WikifunctionsCallNode', () => {
	let node;

	beforeAll( () => {
		// Minimal stand-ins for the VE and OOjs pieces the node uses
		function MWTransclusionInlineNode( model ) {
			this.model = model;
		}
		MWTransclusionInlineNode.static = {};
		MWTransclusionInlineNode.prototype.doneGenerating = jest.fn();

		global.OO = {
			inheritClass: ( Child, Parent ) => {
				Child.super = Parent;
				Child.prototype = Object.create( Parent.prototype );
				Child.prototype.constructor = Child;
				Child.static = Object.create( Parent.static );
			},
			ui: { msg: ( key ) => key }
		};
		global.ve = {
			ce: {
				MWTransclusionInlineNode,
				nodeFactory: { register: jest.fn() }
			}
		};

		require( '../../../resources/ext.wikilambda.visualeditor/ve.ce.WikifunctionsCallNode.js' );
	} );

	beforeEach( () => {
		node = new ve.ce.WikifunctionsCallNode( { getAttribute: () => false } );
	} );

	describe( 'doneGenerating', () => {
		it( 'stores the loading chip under { loading: true }', () => {
			const loadingChip = node.getLoadingState().get();

			node.doneGenerating( loadingChip );

			expect( ve.ce.MWTransclusionInlineNode.prototype.doneGenerating )
				.toHaveBeenCalledWith( loadingChip, { loading: true }, undefined );
		} );

		it( 'stores the final render after retries under { loading: false }', () => {
			const result = [ $( '<span>' ).text( 'Hello, world!' )[ 0 ] ];
			const retryConfig = { loading: true, retryCount: 2, deferred: $.Deferred() };

			node.doneGenerating( result, retryConfig );

			expect( ve.ce.MWTransclusionInlineNode.prototype.doneGenerating )
				.toHaveBeenCalledWith( result, { loading: false }, undefined );
		} );

		it( 'stores the abort chip under { loading: false }', () => {
			const abortChip = node.getAbortState().get();

			node.doneGenerating( abortChip, { loading: true } );

			expect( ve.ce.MWTransclusionInlineNode.prototype.doneGenerating )
				.toHaveBeenCalledWith( abortChip, { loading: false }, undefined );
		} );
	} );
} );
