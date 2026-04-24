<?php

/**
 * WikiLambda HTML fragment renderer with URL policy enforcement
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ParserFunction;

use MediaWiki\Config\Config;
use MediaWiki\Extension\AbuseFilter\AbuseFilterServices;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\User\UserFactory;
use Psr\Log\LoggerInterface;

class WikifunctionsPFragmentRenderer {

	public function __construct(
		private readonly LoggerInterface $logger,
		private readonly UserFactory $userFactory,
		private readonly Config $config
	) {
	}

	/**
	 * Render an HTML fragment safely: check reference-context URLs against spam and blocked
	 * domain lists, then sanitise the HTML through the token handler.
	 *
	 * @param string $html Raw HTML fragment
	 * @return string Sanitised HTML
	 */
	public function render( string $html ): string {
		$blockedDomains = $this->loadBlockedDomains();

		$spamCheckUser = null;
		if ( ExtensionRegistry::getInstance()->isLoaded( 'SpamBlacklist' ) ) {
			$spamCheckUser = $this->userFactory->newAnonymous();
		}

		return WikifunctionsPFragmentSanitiserTokenHandler::sanitiseHtmlFragment(
			$this->logger,
			$html,
			$blockedDomains,
			$spamCheckUser
		);
	}

	/**
	 * Load the blocked domain map from AbuseFilter's BlockedExternalDomains feature.
	 *
	 * @return array<string, true>
	 */
	private function loadBlockedDomains(): array {
		if (
			ExtensionRegistry::getInstance()->isLoaded( 'Abuse Filter' ) &&
			$this->config->get( 'AbuseFilterEnableBlockedExternalDomain' )
		) {
			return AbuseFilterServices::getBlockedDomainStorage()->loadComputed();
		}
		return [];
	}
}
