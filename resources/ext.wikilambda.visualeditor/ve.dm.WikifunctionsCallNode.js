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

// On loading the data model from the DOM, set the isError attribute
ve.dm.WikifunctionsCallNode.static.toDataElement = function ( domElements ) {
	const mwDataJSON = domElements[ 0 ].getAttribute( 'data-mw' );
	const mwData = mwDataJSON ? JSON.parse( mwDataJSON ) : {};
	const isError = domElements[ 0 ].classList.contains( 'cdx-message--error' );

	return {
		type: this.name,
		attributes: {
			mw: mwData,
			isError
		}
	};
};

// For some reason, VE's default code for this isn't working, so let's write a quick one ourselves
ve.dm.WikifunctionsCallNode.static.toDomElements = function ( dataElement, doc, converter ) {
	const store = converter.getStore(),
		originalMw = dataElement.attributes.originalMw,
		originalDomElements = store.value( dataElement.originalDomElementsHash );

	let elements = [];

	if ( originalDomElements ) {
		// If unchanged, just send back the original DOM elements so selser can skip over it
		if ( originalMw && ve.compare( dataElement.attributes.mw, JSON.parse( originalMw ) ) ) {
			return ve.copyDomElements( originalDomElements, doc );
		}
		elements = originalDomElements;
	} else {
		// Create the element from scratch.
		const element = doc.createElement( 'span' );
		element.setAttribute( 'typeof', 'mw:Transclusion mw:ParserFunction/function' );
		element.append( 'foo' );
		elements[ 0 ] = element;
	}

	// Set our new values; note that we're assuming that the first element is our one, which isn't strictly safe
	elements[ 0 ].setAttribute( 'data-mw', JSON.stringify( dataElement.attributes.mw ) );
	return elements;
};

// For some reason, VE's default code for this isn't working, so let's write a quick one ourselves
ve.dm.WikifunctionsCallNode.static.describeChanges = function ( dataElement, oldDataElement ) {
	// If the mw data has changed, we need to update the DOM
	if ( ve.getProp( dataElement, 'attributes', 'mw' ) !== ve.getProp( oldDataElement, 'attributes', 'mw' ) ) {
		return {
			type: 'update',
			attributes: {
				mw: dataElement.attributes.mw
			}
		};
	}

	return null;
};

/* Registration */

ve.dm.modelRegistry.register( ve.dm.WikifunctionsCallNode );
