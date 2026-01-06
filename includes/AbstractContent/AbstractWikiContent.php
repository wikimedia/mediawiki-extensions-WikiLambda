<?php
/**
 * WikiLambda AbstractWikiContent
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use InvalidArgumentException;
use MediaWiki\Content\AbstractContent;
use MediaWiki\Content\TextContent;
use MediaWiki\Json\FormatJson;
use MediaWiki\MediaWikiServices;

/**
 * This class represents the wrapper for an Abstract Wiki content object, as stored in MediaWiki.
 */
class AbstractWikiContent extends AbstractContent {

	private string $text;
	private \stdClass $object;

	public const ABSTRACTCONTENT_SECTION_LEDE = 'Q8776414';

	/**
	 * Builds the Content object that can be saved in the Wiki
	 *
	 * @param string $text
	 * @throws InvalidArgumentException
	 */
	public function __construct( $text ) {
		// Some unit tests somehow don't load our constant by this point, so defensively provide it as needed.
		$ourModel = defined( 'CONTENT_MODEL_ABSTRACT' ) ? CONTENT_MODEL_ABSTRACT : 'abstractwiki';
		parent::__construct( $ourModel );

		// Check that the input is a valid string
		if ( !is_string( $text ) ) {
			throw new InvalidArgumentException(
				'Cannot create AbstractWikiContent from a non-string: ' . gettype( $text )
			);
		}

		$this->text = $text;

		// Check that the input is a valid JSON
		$parseStatus = FormatJson::parse( $text );
		if ( !$parseStatus->isGood() ) {
			$errorMessage = wfMessage( $parseStatus->getErrors()[0]['message'] )->inContentLanguage()->text();
			throw new InvalidArgumentException( $errorMessage );
		}

		$this->object = $parseStatus->getValue();
	}

	/**
	 * @return AbstractWikiContent
	 */
	public static function makeEmptyContent(): AbstractWikiContent {
		// Note: This is not the specification in Z25, but an intentional deviation from for simplicity.
		$blankContent = <<<EOQ
			{
				"qid": "Q0",
				"sections": {
					"Q8776414": {
						"index": 0,
						"fragments": [ "Z89" ]
					}
				}
			}
			EOQ;

		return new self( $blankContent );
	}

	/**
	 * @inheritDoc
	 */
	public function getText() {
		return $this->text;
	}

	/**
	 * @return \stdClass
	 */
	public function getObject() {
		return $this->object;
	}

	/**
	 * @inheritDoc
	 */
	public function getTextForSearchIndex() {
		// TODO (T271963): We'll probably want to inject something special for search with facets/etc.
		return $this->getText();
	}

	/**
	 * @inheritDoc
	 */
	public function getWikitextForTransclusion() {
		// Abstract Wiki pages are not transcludable.
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function getTextForSummary( $maxLength = 250 ) {
		// TODO (T362246): Dependency-inject
		$contentLanguage = MediaWikiServices::getInstance()->getContentLanguage();
		// Splice out newlines from content.
		$textWithoutNewlines = preg_replace( "/[\n\r]/", ' ', $this->getText() );
		$trimLength = max( 0, $maxLength );
		return $contentLanguage->truncateForDatabase( $textWithoutNewlines, $trimLength );
	}

	/**
	 * @inheritDoc
	 */
	public function getNativeData() {
		return $this->getObject();
	}

	/**
	 * @inheritDoc
	 */
	public function getSize() {
		return strlen( $this->getText() );
	}

	/**
	 * @inheritDoc
	 */
	public function copy() {
		// We're immutable.
		return $this;
	}

	/**
	 * @inheritDoc
	 */
	public function convert( $toModel, $lossy = '' ) {
		if ( $toModel === CONTENT_MODEL_ABSTRACT ) {
			return $this;
		}

		if ( $toModel === CONTENT_MODEL_TEXT ) {
			return new TextContent( $this->text );
		}

		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function isCountable( $hasLinks = null ) {
		// TODO (T362246): Dependency-inject
		$config = MediaWikiServices::getInstance()->getMainConfig();

		return (
			!$this->isRedirect()
			&& ( $config->get( 'ArticleCountMethod' ) === 'any' )
		);
	}
}
