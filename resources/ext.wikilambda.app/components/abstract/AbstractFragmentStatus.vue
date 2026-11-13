<!--
	WikiLambda Vue component for the state of the generated text of an Abstract
	Content fragment, when there is no generated text to show: missing, loading
	or failed.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<!-- Fragment exists but was not initialized in this language -->
	<div
		v-if="status === 'missing'"
		class="ext-wikilambda-app-abstract-fragment-status-blank-wrapper"
	>
		<div class="ext-wikilambda-app-abstract-fragment-status-blank">
			{{ missingLabel }}
			<button
				v-if="missingCanRetry"
				type="button"
				class="ext-wikilambda-app-button-reset
					ext-wikilambda-app-abstract-fragment-status-retry"
				:aria-label="i18n( 'wikilambda-abstract-preview-fragment-retry' ).text()"
				@click.stop="$emit( 'retry' )"
			>
				<cdx-icon :icon="iconRetry"></cdx-icon>
			</button>
		</div>
	</div>

	<cdx-progress-indicator
		v-else-if="status === 'loading'"
		class="ext-wikilambda-app-abstract-fragment-status-loading"
	>
		{{ i18n( 'wikilambda-loading' ).text() }}
	</cdx-progress-indicator>

	<div
		v-else-if="status === 'error'"
		class="ext-wikilambda-app-abstract-fragment-status-error-wrapper"
	>
		<cdx-message
			class="ext-wikilambda-app-abstract-fragment-status-error"
			:type="fragmentError.type"
		>
			<wl-safe-message :error="fragmentError.message"></wl-safe-message>
			<button
				v-if="fragmentError.retry"
				type="button"
				class="ext-wikilambda-app-button-reset
					ext-wikilambda-app-abstract-fragment-status-retry"
				@click="$emit( 'retry' )"
			>
				{{ i18n( 'wikilambda-abstract-preview-fragment-retry' ).text() }}
			</button>
			<div v-if="fragmentError.replicateLink">
				<a
					:href="fragmentError.replicateLink"
					target="_blank"
					class="ext-wikilambda-app-abstract-fragment-status-replicate"
				>
					{{ i18n( 'wikilambda-abstract-preview-fragment-replicate' ).text() }}
				</a>
			</div>
		</cdx-message>
	</div>
</template>

<script>
const { defineComponent, inject } = require( 'vue' );

const useFragmentPreview = require( '../../composables/useFragmentPreview.js' );
const icons = require( '../../../lib/icons.json' );

// Base components
const SafeMessage = require( '../base/SafeMessage.vue' );
// Codex components
const { CdxIcon, CdxMessage, CdxProgressIndicator } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-fragment-status',
	components: {
		'wl-safe-message': SafeMessage,
		'cdx-icon': CdxIcon,
		'cdx-message': CdxMessage,
		'cdx-progress-indicator': CdxProgressIndicator
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		fragmentHash: {
			type: String,
			required: false,
			default: null
		}
	},
	emits: [ 'retry' ],
	setup( props ) {
		const i18n = inject( 'i18n' );

		const {
			status,
			missingCanRetry,
			missingLabel,
			fragmentError
		} = useFragmentPreview( () => props.keyPath, () => props.fragmentHash );

		return {
			fragmentError,
			i18n,
			iconRetry: icons.cdxIconReload,
			missingCanRetry,
			missingLabel,
			status
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-fragment-status-blank-wrapper {
	display: inline-block;
}

.ext-wikilambda-app-abstract-fragment-status-blank {
	display: inline-block;
	background-color: @background-color-neutral;
	border: @border-width-base @border-style-base @border-color-muted;
	border-radius: @border-radius-base;
	margin-right: @spacing-25;
	margin-bottom: @spacing-25;
	font-family: @font-family-base;
	font-weight: @font-weight-normal;
	font-size: @font-size-small;
	line-height: @line-height-x-small;
	color: @color-subtle;
	vertical-align: middle;
	padding: @spacing-12 @spacing-35;
}

.ext-wikilambda-app-abstract-fragment-status-loading {
	margin: 0 @spacing-25;
}

.ext-wikilambda-app-abstract-fragment-status-error {
	margin: @spacing-25 0;
}

.ext-wikilambda-app-abstract-fragment-status-retry {
	.cdx-mixin-link();
}
</style>
