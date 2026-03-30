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
use MediaWiki\Json\FormatJson;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use StatusValue;

/**
 * This class represents the wrapper for an Abstract Wiki content object, as stored in MediaWiki.
 */
class AbstractWikiContent extends AbstractContent {

	private ?\stdClass $object;
	private ?StatusValue $status = null;

	public const ABSTRACTCONTENT_SECTION_LEDE = 'Q8776414';

	/**
	 * Builds the Content object that can be saved in the Wiki
	 *
	 * @param string $text
	 * @throws InvalidArgumentException If the input string isn't valid JSON
	 */
	public function __construct( private readonly string $text ) {
		// Some unit tests somehow don't load our constant by this point, so defensively provide it as needed.
		$ourModel = defined( 'CONTENT_MODEL_ABSTRACT' ) ? CONTENT_MODEL_ABSTRACT : 'abstractwiki';
		parent::__construct( $ourModel );

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
	 * @deprecated since 1.33 Use ::getObject() instead.
	 */
	public function getNativeData() {
		wfDeprecated( __METHOD__, '1.33' );
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
			$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-invalid-json' );
			return false;
		}

		// Qid exists, is a string, and has the shape of a qid.
		// Also consider null (Q0) qid as valid, as empty content objects must pass validation
		if (
			!isset( $this->object->qid ) || !is_string( $this->object->qid ) ||
			( !AbstractContentUtils::isValidWikidataItemReference( $this->object->qid ) &&
			!AbstractContentUtils::isNullWikidataItemReference( $this->object->qid ) )
		) {
			$badQid = $this->object->qid ?? null;
			$badQid = is_string( $badQid ) ? $badQid : var_export( $badQid, true );
			$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-bad-qid', $badQid );
			return false;
		}

		// Sections exists and is an object
		if ( !isset( $this->object->sections ) || !is_object( $this->object->sections ) ) {
			$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-missing-sections' );
			return false;
		}

		// Sections must contain a lede section
		if ( !property_exists( $this->object->sections, self::ABSTRACTCONTENT_SECTION_LEDE ) ) {
			$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-missing-lede-section' );
			return false;
		}

		// For each section:
		foreach ( get_object_vars( $this->object->sections ) as $key => $section ) {
			// Section key must be a valid qid
			if ( !AbstractContentUtils::isValidWikidataItemReference( $key ) ) {
				$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-bad-section-qid', $key );
				return false;
			}

			// Section must be an object
			if ( !is_object( $section ) ) {
				$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-bad-section-content', $key );
				return false;
			}

			// Section index must have a positive integer
			if ( !isset( $section->index ) || !is_int( $section->index ) || $section->index < 0 ) {
				$badIndex = $this->object->index ?? (string)null;
				$badIndex = is_string( $badIndex ) ? $badIndex : var_export( $badIndex, true );
				$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-bad-section-index', $key, $badIndex );
				return false;
			}

			// Section fragments must exist and contain an array
			if ( !isset( $section->fragments ) || !is_array( $section->fragments ) ) {
				$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-missing-section-fragments', $key );
				return false;
			}

			// Section fragments must be a benjamin array of HTML/Z89 objects
			if ( count( $section->fragments ) === 0 || $section->fragments[0] !== ZTypeRegistry::Z_HTML_FRAGMENT ) {
				$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-bad-fragments-type', $key );
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
		$innerQid = $this->object->qid;
		$titleQid = $title->getBaseText();
		if ( $innerQid !== $titleQid ) {
			$this->status = StatusValue::newFatal( 'wikilambda-abstract-error-unmatching-qid', $innerQid, $titleQid );
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
