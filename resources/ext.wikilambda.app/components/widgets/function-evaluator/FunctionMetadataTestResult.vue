<!--
	WikiLambda Vue component for rendering test result values (expected/actual)
	with toggle to switch between string and full zobject views.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-function-metadata-test-result"
		:class="{ 'ext-wikilambda-app-function-metadata-test-result--rendered': !showRawJson && isZObject }"
		:data-testid="`function-metadata-test-result-${ keyString }`">
		<div class="ext-wikilambda-app-function-metadata-test-result__content">
			<div
				v-if="showRawJson && isZObject"
				class="ext-wikilambda-app-function-metadata-test-result__raw"
			>
				<code-editor
					class="ext-wikilambda-app-code__code-editor"
					mode="json"
					:read-only="true"
					:value="stringValue"
					data-testid="code-editor"
				></code-editor>
			</div>
			<div
				v-else-if="isZObject"
				class="ext-wikilambda-app-function-metadata-test-result__zobject"
			>
				<wl-z-object-key-value
					:key-path="keyPath"
					:skip-key="true"
					:object-value="zobjectValue"
					:edit="false"
				></wl-z-object-key-value>
			</div>
			<div
				v-else
				class="ext-wikilambda-app-function-metadata-test-result__string"
			>
				{{ stringValue }}
			</div>
		</div>
		<div
			v-if="isZObject"
			class="ext-wikilambda-app-function-metadata-test-result__toggle"
		>
			<cdx-toggle-switch
				class="ext-wikilambda-app-function-metadata-test-result__toggle-switch"
				:model-value="showRawJson"
				@update:model-value="showRawJson = $event"
			>
				{{ i18n( 'wikilambda-functioncall-metadata-show-raw-json' ).text() }}
			</cdx-toggle-switch>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );

const { canonicalToHybrid } = require( '../../../utils/schemata.js' );

// Base components
const CodeEditor = require( '../../base/CodeEditor.vue' );
// Type components
const ZObjectKeyValue = require( '../../types/ZObjectKeyValue.vue' );
// Codex components
const { CdxToggleSwitch } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-metadata-test-result',
	components: {
		'cdx-toggle-switch': CdxToggleSwitch,
		'wl-z-object-key-value': ZObjectKeyValue,
		'code-editor': CodeEditor
	},
	props: {
		value: {
			type: [ String, Object, Array ],
			required: true
		},
		keyString: {
			type: String,
			required: false,
			default: undefined
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );

		const showRawJson = ref( false );

		/**
		 * Returns whether the value is a zobject (not just a string)
		 *
		 * @return {boolean}
		 */
		const isZObject = computed( () => props.value && typeof props.value === 'object' );

		/**
		 * Returns the string value to display
		 *
		 * @return {string}
		 */
		const stringValue = computed( () => {
			if ( !props.value || typeof props.value === 'string' ) {
				return props.value;
			}
			return JSON.stringify( props.value, null, 2 );
		} );

		/**
		 * Returns the zobject value in hybrid form for rendering
		 *
		 * @return {Object|Array|undefined}
		 */
		const zobjectValue = computed( () => {
			if ( !isZObject.value ) {
				return;
			}
			// Convert from canonical to hybrid form for ZObjectKeyValue
			// The value from metadata is in canonical form
			try {
				return canonicalToHybrid( props.value );
			} catch ( e ) {
				// If conversion fails, return the value as-is
				return props.value;
			}
		} );

		/**
		 * Returns a unique key path for the zobject renderer
		 *
		 * @return {string}
		 */
		const keyPath = computed( () => `metadata.${ props.keyString }.value` );

		return {
			i18n,
			isZObject,
			keyPath,
			showRawJson,
			stringValue,
			zobjectValue
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-metadata-test-result {
	margin-bottom: @spacing-50;

	.ext-wikilambda-app-function-metadata-test-result__content {
		margin-top: @spacing-50;
	}

	.ext-wikilambda-app-function-metadata-test-result__string {
		color: @color-base;
	}

	.ext-wikilambda-app-function-metadata-test-result__toggle {
		margin-top: @spacing-50;
	}

	.ext-wikilambda-app-function-metadata-test-result__toggle-switch.cdx-toggle-switch {
		display: flex;
		justify-content: space-between;
	}

	&--rendered {
		margin-top: @spacing-50;

		.ext-wikilambda-app-function-metadata-test-result__toggle {
			margin-top: -@spacing-25;
		}
	}
}
</style>
