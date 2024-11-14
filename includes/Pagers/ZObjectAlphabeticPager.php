<?php
/**
 * WikiLambda ZObjectAlphabeticPager extends AlphabeticPager
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Pagers;

use AlphabeticPager;
use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\Fields\HTMLZLanguageSelectField;
use MediaWiki\Extension\WikiLambda\Fields\HTMLZTypeSelectField;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\HTMLForm\HTMLForm;
use Wikimedia\Rdbms\Subquery;

class ZObjectAlphabeticPager extends AlphabeticPager {

	private ZObjectStore $zObjectStore;
	private array $languageZids;
	private array $filters;

	/**
	 * @param IContextSource|null $context Context.
	 * @param ZObjectStore $zObjectStore
	 * @param array $filters
	 * @param array $languageZids
	 */
	public function __construct( $context, ZObjectStore $zObjectStore, $filters, $languageZids ) {
		parent::__construct( $context );
		$this->zObjectStore = $zObjectStore;
		$this->filters = $filters;
		$this->languageZids = $languageZids;
	}

	/**
	 * Provides all parameters needed for the main paged query. It returns
	 * an associative array with the following elements:
	 *    tables => Table(s) for passing to Database::select()
	 *    fields => Field(s) for passing to Database::select(), may be *
	 *    conds => WHERE conditions
	 *    options => option array
	 *    join_conds => JOIN conditions
	 *
	 * For Wikilambda ZObjects:
	 * * Fetches from labels table
	 * * Uses the normalised primary label for alphabetic pagination
	 *
	 * @return array [ $query, $offsetCondition ]
	 */
	public function getQueryInfo() {
		// Returns table with unique zids and the most preferred primary label
		$subquery = $this->zObjectStore->getPreferredLabelsQuery( $this->languageZids );

		// Create filter conditions for Special List page
		$conditions = [];
		if ( array_key_exists( 'type', $this->filters ) ) {
			// When type is passed, create list of objects of that type
			$conditions[ 'wlzl_type' ] = $this->filters[ 'type' ];
		} else {
			// When type is not passed, create list of types that have instances
			$conditions[ 'wlzl_zobject_zid' ] = $this->zObjectStore->fetchAllInstancedTypes();
		}

		if ( array_key_exists( 'missing_language', $this->filters ) ) {
			$conditions[] = $this->getDatabase()->expr( 'wlzl_language', '!=', $this->filters[ 'missing_language' ] );
		}

		// Add filtering and ordering options
		$query = [
			'tables' => [ 'preferred_labels' => new Subquery( $subquery ) ],
			'fields' => [
				'wlzl_zobject_zid', 'wlzl_label', 'wlzl_label_normalised',
				'wlzl_id', 'wlzl_language', 'wlzl_label_primary'
			],
			'conds' => $conditions,
			'options' => [
				'ORDER BY' => 'wlzl_label ASC'
			]
		];

		return $query;
	}

	/**
	 * Return the name of the field that is used for alphabetic sorting.
	 *
	 * @return string
	 */
	public function getIndexField() {
		return 'wlzl_label_normalised';
	}

	/**
	 * @return string
	 */
	public function getEmptyBody() {
		return $this->msg( 'wikilambda-special-list-empty' );
	}

	/**
	 * @return string
	 */
	public function getBottomLinks() {
		$wikitext = "\n== " . $this->msg( 'wikilambda-special-list-all-pages' ) . " ==\n";

		$wikitext .= "\n* [[Special:ListObjectsByType|" .
			$this->msg( 'wikilambda-special-objectsbytype-link' ) . "]]\n";

		$wikitext .= "\n* [[Special:ListDuplicateObjectNames|" .
			$this->msg( 'wikilambda-special-listduplicateobjectlabels-link' ) . "]]\n";

		$wikitext .= "\n* [[Special:ListMissingLabels|" .
			$this->msg( 'wikilambda-special-missinglabels' ) . "]]\n";

		// TODO (T377909)
		// $wikitext .= "\n* [[Special:ListFunctionsWithUnconnectedTests|List of Functions with unconnected Tests ]]\n";

		// TODO (T377910)
		// $wikitext .= "\n* [[Special:ListUntestedFunctions|List of Functions with fewer Tests ]]\n";

		return $wikitext;
	}

	/**
	 * Process each row returned from the query.
	 * This is where we build up the list of ZObjects.
	 *
	 * @param \stdClass $row
	 * @return string
	 */
	public function formatRow( $row ) {
		$zid = $row->wlzl_zobject_zid;
		$label = $row->wlzl_label;

		return array_key_exists( 'type', $this->filters ) ?
			"# [[$zid|$label]] ($zid)\n" :
			"# [[Special:ListObjectsByType/$zid|$label]] ($zid)\n";
	}

	/**
	 * @param string $typeZid
	 * @param string $langZid
	 * @param string $formHeader
	 * @return string
	 */
	public function getHeaderForm( $typeZid, $langZid, $formHeader ) {
		$formDescriptor = [
			'type' => [
				'label' => 'Type',
				'class' => HTMLZTypeSelectField::class,
				'name' => 'type',
				'default' => $typeZid
			],
			'language' => [
				'label' => 'Language',
				'class' => HTMLZLanguageSelectField::class,
				'name' => 'language',
				'default' => $langZid
			]
		];

		$htmlForm = HTMLForm::factory( 'ooui', $formDescriptor, $this->getContext() )
			->setWrapperLegend( $formHeader )
			->setMethod( 'get' );
		return $htmlForm->prepareForm()->getHTML( false );
	}
}
