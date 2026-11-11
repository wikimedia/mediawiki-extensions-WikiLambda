<!--
	WikiLambda Vue component for Z96/Wikifunctions object references.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikifunctions-reference"
		data-testid="wikifunctions-reference">
		<template v-if="hasTerminalZid">
			<div v-if="!edit" class="ext-wikilambda-app-wikifunctions-reference__read">
				<cdx-icon
					class="ext-wikilambda-app-wikifunctions-reference__icon"
					:icon="wikifunctionsIcon"
				></cdx-icon>
				<a
					v-if="objectUrl"
					class="ext-wikilambda-app-wikifunctions-reference__link"
					:href="objectUrl"
					:lang="objectLabelData.langCode"
					:dir="objectLabelData.langDir"
				>{{ objectLabelData.label }}</a>
				<!-- No link: value is not a valid ZID -->
				<span
					v-else-if="objectZid"
					class="ext-wikilambda-app-wikifunctions-reference__unknown"
				>{{ objectZid }}</span>
				<!-- No value -->
				<span v-else class="ext-wikilambda-app-wikifunctions-reference__empty">
					{{ i18n( 'wikilambda-wikifunctions-reference-empty-value-placeholder' ).text() }}
				</span>
			</div>
			<wl-z-object-selector
				v-else
				:key-path="keyPath"
				:selected-zid="objectZid"
				:disabled="disabled"
				:icon="wikifunctionsIcon"
				:placeholder="i18n( 'wikilambda-wikifunctions-reference-selector-placeholder' ).text()"
				@select-item="onSelect"
			></wl-z-object-selector>
		</template>
		<wl-z-object-to-string
			v-else
			:key-path="keyPath"
			:object-value="objectValue"
			:edit="edit"
			@expand="$emit( 'expand', true )"
		></wl-z-object-to-string>
	</div>
</template>

<script>
const { defineComponent, computed, inject, watch } = require( 'vue' );

const Constants = require( '../../Constants.js' );
const useMainStore = require( '../../store/index.js' );
const { isValidZidFormat } = require( '../../utils/typeUtils.js' );
const urlUtils = require( '../../utils/urlUtils.js' );
const { getWikifunctionsReferenceId } = require( '../../utils/zobjectUtils.js' );
const wikifunctionsIconSvg = require( '../visualeditor/wikifunctionsIconSvg.js' );

// Base components
const ZObjectSelector = require( '../base/ZObjectSelector.vue' );
// Type components
const ZObjectToString = require( './ZObjectToString.vue' );
// Codex components
const { CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-z-wikifunctions-reference',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'wl-z-object-to-string': ZObjectToString,
		'cdx-icon': CdxIcon
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'set-value', 'expand' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const wikifunctionsIcon = wikifunctionsIconSvg;

		/**
		 * Returns the referenced ZID, or an empty string if unset.
		 * Returns undefined if the ZID is not a terminal string
		 * (e.g. it is returned by a function call).
		 *
		 * @return {string|undefined}
		 */
		const objectZid = computed( () => getWikifunctionsReferenceId( props.objectValue ) );

		/**
		 * Returns whether the referenced ZID is a terminal string. If not,
		 * the component falls back to z-object-to-string, which shows
		 * what returns the ZID; editing it requires expansion.
		 *
		 * @return {boolean}
		 */
		const hasTerminalZid = computed( () => typeof objectZid.value === 'string' );

		/**
		 * Returns the label data of the referenced object.
		 *
		 * @return {LabelData}
		 */
		const objectLabelData = computed( () => store.getLabelData( objectZid.value ) );

		/**
		 * Returns the link to the page of the referenced object,
		 * or undefined if the value is not a valid ZID.
		 *
		 * @return {string|undefined}
		 */
		const objectUrl = computed( () => ( isValidZidFormat( objectZid.value ) ?
			urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid: objectZid.value } ) :
			undefined
		) );

		/**
		 * Emits a set-value event to persist the selected ZID. It sets the
		 * string value (Z6K1), so that the ZID is kept as a string and not
		 * turned into a reference.
		 *
		 * @param {string} zid
		 */
		function onSelect( zid ) {
			emit( 'set-value', {
				keyPath: [ Constants.Z_WIKIFUNCTIONS_REFERENCE_ID, Constants.Z_STRING_VALUE ],
				value: zid
			} );
		}

		watch( objectZid, ( zid ) => {
			if ( isValidZidFormat( zid ) ) {
				store.fetchZids( { zids: [ zid ] } );
			}
		}, { immediate: true } );

		return {
			hasTerminalZid,
			i18n,
			objectLabelData,
			objectUrl,
			objectZid,
			onSelect,
			wikifunctionsIcon
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikifunctions-reference {
	--line-height-current: calc( var( --line-height-content ) * 1em );

	.ext-wikilambda-app-wikifunctions-reference__read {
		display: flex;
		align-items: normal;
		min-height: @min-size-interactive-pointer;
		box-sizing: border-box;
		/* We calculate dynamically a different padding for each font size setting */
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
	}

	.ext-wikilambda-app-wikifunctions-reference__link {
		line-height: var( --line-height-current );
		word-break: normal;
		overflow-wrap: anywhere;
	}

	.ext-wikilambda-app-wikifunctions-reference__unknown {
		color: @color-subtle;
	}

	.ext-wikilambda-app-wikifunctions-reference__empty {
		color: @color-placeholder;
		font-style: italic;
	}

	.ext-wikilambda-app-wikifunctions-reference__icon {
		margin: 0 @spacing-25;
		height: var( --line-height-current );
	}
}
</style>
