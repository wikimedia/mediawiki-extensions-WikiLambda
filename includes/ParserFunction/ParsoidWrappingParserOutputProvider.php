<?php

/**
 * WikiLambda extension Parsoid wrapper for Wikibase's content injection tracking system
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ParserFunction;

use MediaWiki\Parser\ParserOutput;
use Wikibase\Client\ParserOutput\ParserOutputProvider;
use Wikimedia\Parsoid\Config\StubMetadataCollector;
use Wikimedia\Parsoid\Core\ContentMetadataCollector;

/**
 * Provides a ParserOutput for the Parsoid wrapping of the Wikifunctions content.
 *
 * @todo This should really be provided by Wikibase, not us, but needs must.
 */
class ParsoidWrappingParserOutputProvider implements ParserOutputProvider {
	private ContentMetadataCollector $contentMetadataCollector;

	public function __construct( ContentMetadataCollector $contentMetadataCollector ) {
		$this->contentMetadataCollector = $contentMetadataCollector;
	}

	public function getParserOutput(): ParserOutput {
		// In tests, instead of a real ParserOutput Parsoid uses a StubMetadataCollector
		if ( $this->contentMetadataCollector instanceof StubMetadataCollector ) {
			$dummyParserOutput = new ParserOutput();
			$dummyParserOutput->collectMetadata( $this->contentMetadataCollector );
			return $dummyParserOutput;
		}

		// ParserOutput implements the ContentMetadataCollector interface, but phan can't
		// magically know that, so help it out.
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType
		return $this->contentMetadataCollector;
	}
}
