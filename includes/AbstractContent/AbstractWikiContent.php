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
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Json\FormatJson;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use StatusValue;

/**
 * This class represents the wrapper for an Abstract Wiki content object, as stored in MediaWiki.
 */
class AbstractWikiContent extends AbstractContent {

	private string $text;
	private ?\stdClass $object;
	private ?StatusValue $status = null;

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
		$blankContent = <<<EOD
{
	"qid": "Q0",
	"sections": {
		"Q8776414": {
			"index": 0,
			"fragments": [ "Z89" ]
		}
	}
}
EOD;

		return new self( $blankContent );
	}

	/**
	 * @return string
	 */
	public function getText() {
		return $this->text;
	}

	/**
	 * @return ?\stdClass
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

	/**
	 * @inheritDoc
	 */
	public function isValid() {
		// Content exists and is the right type
		if ( !isset( $this->object ) ) {
			$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki' );
			return false;
		}

		// Qid exists, is a string, and has the shape of a qid.
		// Also consider null (Q0) qid as valid, as empty content objects must pass validation
		if (
			!isset( $this->object->qid ) || !is_string( $this->object->qid ) ||
			( !ZObjectUtils::isValidWikidataItemReference( $this->object->qid ) &&
			!ZObjectUtils::isNullWikidataItemReference( $this->object->qid ) )
		) {
			$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-badqid' );
			return false;
		}

		// Sections exists and is an object
		if ( !isset( $this->object->sections ) || !is_object( $this->object->sections ) ) {
			$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-nosections' );
			return false;
		}

		// Sections must contain a lede section
		if ( !property_exists( $this->object->sections, self::ABSTRACTCONTENT_SECTION_LEDE ) ) {
			$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-nolede' );
			return false;
		}

		// For each section:
		foreach ( get_object_vars( $this->object->sections ) as $key => $section ) {
			// Section key must be a valid qid
			if ( !ZObjectUtils::isValidWikidataItemReference( $key ) ) {
				$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-section-badqid' );
				return false;
			}

			// Section must be an object
			if ( !is_object( $section ) ) {
				$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-section-badsection' );
				return false;
			}

			// Section index must have a positive integer
			if ( !isset( $section->index ) || !is_int( $section->index ) || $section->index < 0 ) {
				$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-section-badindex' );
				return false;
			}

			// Section fragments must exist and contain an array
			if ( !isset( $section->fragments ) || !is_array( $section->fragments ) ) {
				$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-section-nofragments' );
				return false;
			}

			// Section fragments must be a benjamin array of HTML/Z89 objects
			if ( count( $section->fragments ) === 0 || $section->fragments[0] !== ZTypeRegistry::Z_HTML_FRAGMENT ) {
				$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-section-badfragments' );
				return false;
			}
		}

		// Passed all checks
		$this->status = StatusValue::newGood();
		return true;
	}

	/**
	 * Whether the content is valid for a given title.
	 *
	 * This method only checks whether a given title matches the internal
	 * internal qid property of the content. If that passes, then we
	 * call isValid(), which checks for content validity, independently
	 * from the page identity.
	 *
	 * @param Title $title
	 * @return bool
	 */
	public function isValidForTitle( Title $title ) {
		// title is the same as object->qid
		if ( !$this->object->qid === $title->getBaseText() ) {
			$this->status = StatusValue::newFatal( 'wikilambda-invalid-abstractwiki-unmatching-qid' );
			return false;
		}

		return $this->isValid();
	}

	/**
	 * @return StatusValue|null
	 */
	public function getStatus() {
		return $this->status;
	}
}
