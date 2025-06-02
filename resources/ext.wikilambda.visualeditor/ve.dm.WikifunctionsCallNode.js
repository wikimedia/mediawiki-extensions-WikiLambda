/*!
 * WikiLambda extension's VisualEditor DataModel class for embedded Wikifunction calls.
 *
 * @copyright Abstract Wikipedia Team and others
 * @license The MIT License (MIT); see LICENSE.txt
 */

/**
 * DataModel layer for the Wikifunctions call node.
 *
 * @class
 * @extends ve.dm.MWTransclusionInlineNode
 *
 * @constructor
 * @param {Object} [element]
 */
ve.dm.WikifunctionsCallNode = function VeDmWikifunctionsCallNode() {
	// Parent constructor
	ve.dm.WikifunctionsCallNode.super.apply( this, arguments );
};

/* Inheritance */

OO.inheritClass( ve.dm.WikifunctionsCallNode, ve.dm.MWTransclusionInlineNode );

/* Static members */

ve.dm.WikifunctionsCallNode.static.name = 'WikifunctionsCall';

ve.dm.WikifunctionsCallNode.static.inlineType = 'WikifunctionsCall';

ve.dm.WikifunctionsCallNode.static.blockType = 'WikifunctionsCall';

ve.dm.WikifunctionsCallNode.static.isContent = true;

ve.dm.WikifunctionsCallNode.static.matchTagNames = null;

ve.dm.WikifunctionsCallNode.static.matchRdfaTypes = [ 'mw:ParserFunction/function' ];

ve.dm.WikifunctionsCallNode.static.enableAboutGrouping = true;

// We do this hack so we have more specificity than a general inline transclusion
ve.dm.WikifunctionsCallNode.static.matchFunction = function ( domElement ) {
	const mwDataJSON = domElement.getAttribute( 'data-mw' );
	const mwData = mwDataJSON ? JSON.parse( mwDataJSON ) : {};
	const mwPart = ( mwData.parts || [] )[ 0 ];
	if ( !mwPart ) {
		return false;
	}
	return ve.getProp( mwPart, 'parserfunction', 'target', 'key' ) === 'function';
};

ve.dm.WikifunctionsCallNode.static.getWikitext = function ( mwData ) {
	const values = Object.keys( mwData.parts[ 0 ].parserfunction.params )
		.filter( ( index ) => !!mwData.parts[ 0 ].parserfunction.params[ index ] )
		.map( ( index ) => {
			const param = mwData.parts[ 0 ].parserfunction.params[ index ];
			return !isNaN( index ) && !isNaN( parseInt( index ) ) ?
				param.wt :
				`${ index }=${ param.wt }`;
		} );

	return '{{' + mwData.parts[ 0 ].parserfunction.target.wt + ':' + values.join( '|' ) + '}}';
};

/**
 * @inheritdoc ve.dm.GeneratedContentNode
 */
ve.dm.WikifunctionsCallNode.static.getHashObjectForRendering = function ( dataElement ) {
	return {
		type: dataElement.type,
		mw: dataElement.attributes.mw
	};
};

/**
 * On loading the data model from the DOM, set additional attributes
 * to capture the function call state:
 * * isError: failed function call, DOM is error box
 *
 * @inheritdoc
 */
ve.dm.WikifunctionsCallNode.static.toDataElement = function ( domElements ) {
	// Parent method
	const dataElement = ve.dm.WikifunctionsCallNode.super.static.toDataElement.apply( this, arguments );

	const isError = domElements[ 0 ].classList.contains( 'cdx-message--error' );
	dataElement.attributes.isError = isError;

	return dataElement;
};

/**
 * For DOM generated in preview, get the dom elements stored in the
 * hash store if a function call was done loading. Else fallback to
 * the parent behavior (show function icon)
 *
 * @inheritdoc
 */
ve.dm.WikifunctionsCallNode.static.toDomElements = function ( dataElement, doc, converter ) {
	const store = converter.getStore(),
		originalMw = dataElement.attributes.originalMw,
		originalDomElements = store.value( dataElement.originalDomElementsHash );

	// Selser reuse case
	if (
		originalDomElements &&
		originalMw &&
		ve.compare( dataElement.attributes.mw, JSON.parse( originalMw ) )
	) {
		return ve.copyDomElements( originalDomElements, doc );
	}

	if ( converter.isForPreview() ) {
		// We get the dom element stored with a loading=false state
		const config = { loading: false };
		const hash = store.hashOfValue( null, OO.getHash( [ this.getHashObjectForRendering( dataElement ), config ] ) );
		const value = store.value( hash );

		// If value is found, it was done loading
		// Else, fallback to parent behavior (function icon)
		if ( value ) {
			return ve.copyDomElements( value, doc );
		}
	}

	return ve.dm.WikifunctionsCallNode.super.static.toDomElements.apply( this, arguments );
};

/**
 * @inheritdoc
 */
ve.dm.WikifunctionsCallNode.static.describeChanges = function ( attributeChanges ) {
	const descriptions = [ ve.msg( 'wikilambda-visualeditor-wikifunctionscall-changedesc-title' ) ];

	// NOTE: Only coping with Function calls in single-part transclusions for now; more complex changes
	// will just get "Wikifunctions inputs changed" but no details.
	if ( attributeChanges.mw.from.parts.length === 1 && attributeChanges.mw.to.parts.length === 1 ) {

		const params = {};
		let param;
		for ( param in attributeChanges.mw.from.parts[ 0 ].parserfunction.params ) {
			params[ param ] = { from: attributeChanges.mw.from.parts[ 0 ].parserfunction.params[ param ].wt || '' };
		}
		for ( param in attributeChanges.mw.to.parts[ 0 ].parserfunction.params ) {
			params[ param ] = ve.extendObject(
				{ to: attributeChanges.mw.to.parts[ 0 ].parserfunction.params[ param ].wt || '' },
				params[ param ]
			);
		}

		let paramChanges;
		for ( param in params ) {
			// All we know is that *something* changed, without the normal
			// helpful just-being-given-the-changed-bits, so we have to filter
			// this ourselves.
			// Trim string values, and convert empty strings to undefined
			const from = ( params[ param ].from || '' ).trim() || undefined,
				to = ( params[ param ].to || '' ).trim() || undefined;
			if ( from !== to ) {
				const change = this.describeChange( param, { from: from, to: to } );
				if ( change ) {
					if ( !paramChanges ) {
						paramChanges = document.createElement( 'ul' );
						descriptions.push( paramChanges );
					}
					const listItem = document.createElement( 'li' );
					if ( typeof change === 'string' ) {
						listItem.appendChild( document.createTextNode( change ) );
					} else {
						change.forEach( ( node ) => {
							listItem.appendChild( node );
						} );
					}
					paramChanges.appendChild( listItem );
				}
			}
		}

	}
	return descriptions;
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.WikifunctionsCallNode );
