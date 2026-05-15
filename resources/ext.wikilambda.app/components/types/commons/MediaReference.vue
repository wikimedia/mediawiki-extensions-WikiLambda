<!--
	WikiLambda Vue component for Z310/Commons Image Data Reference types.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-commons-media-reference"
		data-testid="commons-media-reference">
		<div v-if="!edit" class="ext-wikilambda-app-commons-media-reference__read">
			<cdx-icon
				class="ext-wikilambda-app-commons-media-reference__icon"
				:icon="imageIcon"
			></cdx-icon>
			<a
				v-if="mediaTitle && mediaUrl"
				class="ext-wikilambda-app-commons-media-reference__link"
				:href="mediaUrl"
				target="_blank"
			>{{ mediaTitle }}</a>
			<!-- M-ID set but data not yet fetched or missing -->
			<span
				v-else-if="mediaId"
				class="ext-wikilambda-app-commons-media-reference__unknown"
			>{{ mediaId }}</span>
			<!-- No M-ID set -->
			<span v-else class="ext-wikilambda-app-commons-media-reference__empty">
				{{ i18n( 'wikilambda-commons-media-empty-value-placeholder' ).text() }}
			</span>
		</div>
		<wl-commons-media-selector
			v-else
			:media-id="mediaId"
			:media-title="mediaTitle"
			:placeholder="i18n( 'wikilambda-commons-media-selector-placeholder' ).text()"
			:mime-types="[ 'image/' ]"
			@select-commons-media="onSelect"
		></wl-commons-media-selector>
	</div>
</template>

<script>
const { defineComponent, computed, inject, watch } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const { getCommonsMediaId } = require( '../../../utils/zobjectUtils.js' );
const icons = require( '../../../../lib/icons.json' );

const CommonsMediaSelector = require( './MediaSelector.vue' );

// Codex components
const { CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-commons-media-reference',
	components: {
		'wl-commons-media-selector': CommonsMediaSelector,
		'cdx-icon': CdxIcon
	},
	props: {
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'set-value' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const imageIcon = icons.cdxIconImage;

		/**
		 * Returns the M-ID string from the Z310 object (Z310K1),
		 * or empty string if unset.
		 *
		 * @return {string}
		 */
		const mediaId = computed( () => getCommonsMediaId( props.objectValue ) );

		/**
		 * Returns the file title for the selected M-ID (e.g. "File:Cat.jpg"),
		 * or empty string while not yet fetched.
		 *
		 * @return {string}
		 */
		const mediaTitle = computed( () => store.getCommonsMediaTitle( mediaId.value ) || '' );

		/**
		 * Returns the Commons description page URL for the current M-ID.
		 *
		 * @return {string|undefined}
		 */
		const mediaUrl = computed( () => store.getCommonsMediaDescriptionUrl( mediaId.value ) );

		/**
		 * Emit a set-value event to update Z310K1 with the newly selected M-ID.
		 *
		 * @param {string|null} value
		 */
		function onSelect( value ) {
			emit( 'set-value', {
				value: value || '',
				keyPath: [ Constants.Z_COMMONS_MEDIA_REFERENCE_ID ]
			} );
		}

		watch( mediaId, ( id ) => {
			if ( id ) {
				store.fetchCommonsMedia( { ids: [ id ] } );
			}
		}, { immediate: true } );

		return {
			imageIcon,
			mediaId,
			mediaTitle,
			mediaUrl,
			onSelect,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-commons-media-reference {
	--line-height-current: calc( var( --line-height-content ) * 1em );

	.ext-wikilambda-app-commons-media-reference__read {
		display: flex;
		align-items: normal;
		min-height: @min-size-interactive-pointer;
		box-sizing: border-box;
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
	}

	.ext-wikilambda-app-commons-media-reference__link {
		line-height: var( --line-height-current );
		word-break: normal;
		overflow-wrap: anywhere;
	}

	.ext-wikilambda-app-commons-media-reference__unknown {
		color: @color-subtle;
	}

	.ext-wikilambda-app-commons-media-reference__empty {
		color: @color-placeholder;
		font-style: italic;
	}

	.ext-wikilambda-app-commons-media-reference__icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
