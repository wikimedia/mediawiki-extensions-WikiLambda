<!--
	WikiLambda Vue interface module for selecting a generic type, which can be terminal
	(reference) or non terminal (function call which requires arguments)

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-type-selector" data-testid="type-selector">
		<!-- Main type selector -->
		<cdx-field>
			<template #label>
				<span
					v-if="labelData"
					:lang="labelData.langCode"
					:dir="labelData.langDir"
				>
					{{ labelData.label }}
				</span>
			</template>
			<wl-z-object-selector
				:exclude-zids="excludeZids"
				:disabled="disabled"
				:placeholder="placeholder"
				:key-path="keyPath"
				:selected-zid="selectedZid"
				:return-type="type"
				:strict-return-type="true"
				@select-item="setValue"
			></wl-z-object-selector>
		</cdx-field>
		<!-- Argument selectors -->
		<div
			v-if="!!selectedZid && !selectedIsTerminal"
			class="ext-wikilambda-app-type-selector__args"
		>
			<wl-type-selector
				v-for="key of genericTypeArgKeys"
				:key="`${ keyPath }.${ key }`"
				data-testid="type-selector-arg"
				:key-path="`${ keyPath }.${ key }`"
				:object-value="objectValue[ key ]"
				:label-data="getLabelData( key )"
				:type="getExpectedTypeOfKey( key )"
				:disabled="disabled"
				:placeholder="placeholder"
			></wl-type-selector>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );

const Constants = require( '../../Constants.js' );
const LabelData = require( '../../store/classes/LabelData.js' );
const useMainStore = require( '../../store/index.js' );
const typeMixin = require( '../../mixins/typeMixin.js' );
const zobjectMixin = require( '../../mixins/zobjectMixin.js' );

// Base components
const ZObjectSelector = require( './ZObjectSelector.vue' );
// Codex components
const { CdxField } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-type-selector',
	components: {
		'cdx-field': CdxField,
		'wl-z-object-selector': ZObjectSelector
	},
	mixins: [ typeMixin, zobjectMixin ],
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: [ Object ],
			required: true
		},
		disabled: {
			type: Boolean,
			default: false
		},
		type: {
			type: String,
			required: false,
			default: Constants.Z_TYPE
		},
		placeholder: {
			type: String,
			default: ''
		},
		labelData: {
			type: LabelData,
			default: null
		}
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getExpectedTypeOfKey',
		'getLabelData',
		'getStoredObject'
	] ), {
		/**
		 * Returns the string type (mode) of the selected value,
		 * which can be a Reference/Z9 or a Function call/Z7.
		 *
		 * @return {string}
		 */
		selectedMode: function () {
			return this.typeToString( this.getZObjectType( this.objectValue ) );
		},
		/**
		 * Returns whether the selected value is terminal
		 * (Reference/Z9) or non-terminal (Function call/Z7).
		 *
		 * @return {boolean}
		 */
		selectedIsTerminal: function () {
			return this.selectedMode === Constants.Z_REFERENCE;
		},
		/**
		 * Returns the selected value.
		 *
		 * @return {string}
		 */
		selectedZid: function () {
			// If terminal, return the Zid of the selected reference;
			// else, return the Zid of the selected function call.
			return this.selectedIsTerminal ?
				this.getZReferenceTerminalValue( this.objectValue ) :
				this.getZFunctionCallFunctionId( this.objectValue );
		},
		/**
		 * Returns the arguments of generic type function call
		 *
		 * @return {Array}
		 */
		genericTypeArgKeys: function () {
			return this.selectedIsTerminal ? [] : this.getZFunctionCallArgumentKeys( this.objectValue );
		},
		/**
		 * Returns the zids to be excluded from the type selector.
		 * for now, we exclude the Wikidata enum type.
		 *
		 * @return {Array}
		 */
		excludeZids: function () {
			return [ Constants.Z_WIKIDATA_ENUM, Constants.Z_OBJECT_ENUM ];
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'createObjectByType',
		'setValueByKeyPath',
		'setFunctionCallArguments'
	] ), {
		/**
		 * Clears the type selector and persist a blank reference value
		 */
		clearValue: function () {
			const value = this.createObjectByType( { type: Constants.Z_REFERENCE } );
			this.setValueByKeyPath( {
				keyPath: this.keyPath.split( '.' ),
				value
			} );
		},
		/**
		 * Persists the selected value in the global store.
		 * If the selected value is of the required type, we persist as a reference
		 * Else, the selected value is a function that returns the required type,
		 * so we persist as a function call and fill up with the necessary arguments.
		 *
		 * @param {string} zid
		 */
		setValue: function ( zid ) {
			if ( !zid ) {
				this.clearValue();
				return;
			}

			const zobject = this.getStoredObject( zid );
			if ( !zobject ) {
				// This should not happen, the objects are requested as soon as the
				// lookup menu is displayed, so they should be available by now.
				return;
			}
			const type = this.getZObjectType( zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ] );

			// If the selected zid is a function: we set a function call with Z7K1 set to the selected zid.
			// Else: we set a reference with Z9K1 set to the selected zid.
			const mode = type === Constants.Z_FUNCTION ? Constants.Z_FUNCTION_CALL : Constants.Z_REFERENCE;
			const value = this.createObjectByType( { type: mode, value: zid } );
			this.setValueByKeyPath( {
				keyPath: this.keyPath.split( '.' ),
				value
			} );

			// Additionally, if the selected object is a function call, we also set up its arguments:
			if ( mode === Constants.Z_FUNCTION_CALL ) {
				this.setFunctionCallArguments( {
					keyPath: this.keyPath.split( '.' ),
					functionZid: zid
				} );
			}
		}
	} )
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-type-selector {
	margin-bottom: @spacing-100;

	&:last-child {
		margin-bottom: 0;
	}

	.ext-wikilambda-app-type-selector__args {
		margin-top: @spacing-100;
		margin-left: @spacing-100;
	}
}
</style>
