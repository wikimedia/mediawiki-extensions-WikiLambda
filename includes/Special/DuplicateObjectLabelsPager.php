<?php
/**
 * WikiLambda pager for listing Objects with duplicate labels
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Cache\LinkBatchFactory;
use MediaWiki\Html\Html;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Pager\TablePager;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;

class DuplicateObjectLabelsPager extends TablePager {

	private LinkBatchFactory $linkBatchFactory;
	private LanguageNameUtils $languageUtils;

	/**
	 * @param SpecialPage $form
	 * @param LinkRenderer $linkRenderer
	 * @param LinkBatchFactory $linkBatchFactory
	 * @param LanguageNameUtils $languageUtils
	 */
	public function __construct(
		SpecialPage $form,
		LinkRenderer $linkRenderer,
		LinkBatchFactory $linkBatchFactory,
		LanguageNameUtils $languageUtils
	) {
		parent::__construct( $form->getContext(), $linkRenderer );

		$this->linkBatchFactory = $linkBatchFactory;
		$this->languageUtils = $languageUtils;
	}

	/**
	 * @inheritDoc
	 */
	protected function getFieldNames() {
		return [
			'wlzlc_existing_zid' => $this->msg( 'wikilambda-special-listduplicateobjectlabels-existing' )->text(),
			'wlzlc_conflicting_zid' => $this->msg( 'wikilambda-special-listduplicateobjectlabels-conflicting' )->text(),
			'wlzlc_language' => $this->msg( 'wikilambda-special-listduplicateobjectlabels-language' )->text(),
		];
	}

	/**
	 * @param string $field
	 * @param string $value
	 * @return string HTML
	 */
	public function formatValue( $field, $value ) {
		$row = $this->mCurrentRow;
		$linkRenderer = $this->getLinkRenderer();

		if ( $field === 'wlzlc_language' ) {
			$result = Html::element(
				'span',
				[ 'class' => 'ext-wikilambda-language' ],
				$this->languageUtils->getLanguageName( $value, $this->getLanguage()->getCode() )
			);
		} else {
			$result = Html::rawElement(
				'span',
				[ 'class' => 'ext-wikilambda-zobject' ],
				$linkRenderer->makeLink( Title::makeTitleSafe( NS_MAIN, $row->$field ) )
			);
		}

		return $result;
	}

	/**
	 * @inheritDoc
	 */
	public function getQueryInfo() {
		return [
			'tables' => 'wikilambda_zobject_label_conflicts',
			'fields' => [ 'wlzlc_id', 'wlzlc_existing_zid', 'wlzlc_conflicting_zid', 'wlzlc_language' ],
			'conds' => []
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getTableClass() {
		return parent::getTableClass() . ' ext-wikilambda-special-listduplicateobjectlabels ';
	}

	/**
	 * @inheritDoc
	 */
	public function getIndexField() {
		return 'wlzlc_id';
	}

	/**
	 * @inheritDoc
	 */
	public function getDefaultSort() {
		return 'wlzlc_id';
	}

	/**
	 * @inheritDoc
	 */
	protected function isFieldSortable( $field ) {
		return false;
	}

}
