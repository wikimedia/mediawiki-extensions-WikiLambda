<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="classZObjectKey">
		<!-- zKey label -->
		<span v-if="zKey">{{ zKeyLabel }}</span>

		<!-- If type isn't selected, show type selector -->
		<z-object-selector
			v-if="!zType"
			:type="Constants.Z_TYPE"
			:placeholder="$i18n( 'wikilambda-typeselector-label' )"
			@input="onTypeChange"
		></z-object-selector>

		<!-- If there's a type, we render the appropriate component -->
		<template v-else>
			<span>
				<a :href="zTypeLink" :target="!viewmode ? '_blank' : ''">{{ zTypeLabel }}</a>
			</span>
			<z-key-mode-selector
				v-if="!(viewmode || readonly) && selectedMode && !isIdentityKey && zType !== Constants.Z_OBJECT"
				:mode="selectedMode"
				:parent-type="parentType"
				:literal-type="literalType"
				@change="onModeChange"
			></z-key-mode-selector>
			<z-object-generic
				v-if="selectedMode === Constants.Z_KEY_MODES.GENERIC_LITERAL"
				:zobject-id="zobjectId"
				:type="zType"
				:persistent="false"
				:readonly="readonly"
			></z-object-generic>
			<z-reference
				v-else-if="selectedMode === Constants.Z_KEY_MODES.REFERENCE"
				:zobject-id="zobjectId"
				:readonly="readonly"
			></z-reference>
			<z-object-json
				v-else-if="selectedMode === Constants.Z_KEY_MODES.JSON"
				:zobject-id="zobjectId"
				:readonly="readonly"
				@change-literal="onliteralChange"
			></z-object-json>
			<!-- Constants.Z_KEY_MODES.FUNCTION_CALL -->
			<!-- Constants.Z_KEY_MODES.LITERAL -->
			<z-object
				v-else
				:zobject-id="zobjectId"
				:persistent="false"
				:readonly="readonly"
			></z-object>
		</template>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZKeyModeSelector = require( './ZKeyModeSelector.vue' ),
	ZObjectGeneric = require( './ZObjectGeneric.vue' ),
	ZReference = require( './types/ZReference.vue' ),
	ZObjectJson = require( './ZObjectJson.vue' ),
	mapState = require( 'vuex' ).mapState,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../mixins/typeUtils.js' );

module.exports = {
	name: 'ZObjectKey',
	components: {
		'z-object-selector': ZObjectSelector,
		'z-reference': ZReference,
		'z-key-mode-selector': ZKeyModeSelector,
		'z-object-generic': ZObjectGeneric,
		'z-object-json': ZObjectJson
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zKey: {
			type: String
		},
		zobjectId: {
			type: Number,
			required: true
		},
		parentType: {
			type: String,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			Constants: Constants,
			selectedMode: Constants.Z_KEY_MODES.LITERAL,
			literalType: Constants.Z_KEY_MODES.LITERAL
		};
	},
	watch: {
		getZkeys: function () {
			if ( !this.zKey ) {
				return;
			}
			var literal = this.getZkeyLiteralType( this.zKey );
			if ( literal &&
				this.literalType !== literal &&
				literal !== Constants.Z_OBJECT
			) {
				this.literalType = literal;
			}
		},
		zType: {
			immediate: true,
			handler: function () {
				this.selectedMode = this.getModeByType( this.zType );
			}
		}
	},
	computed: $.extend( {},
		mapState( [
			'zKeys'
		] ),
		mapGetters( [
			'getZObjectTypeById',
			'getZkeyLiteralType',
			'getTypeByMode',
			'getZkeyLabels',
			'getZkeys',
			'getModeByType',
			'getCurrentZObjectId',
			'getZObjectChildrenById'
		] ),
		{
			classZObjectKey: function () {
				return {
					'ext-wikilambda-zobject-key': true,
					'ext-wikilambda-zobject-key-inline': this.isInlineType
				};
			},
			isInlineType: function () {
				return [
					Constants.Z_FUNCTION_CALL,
					Constants.Z_STRING,
					Constants.Z_REFERENCE,
					Constants.Z_BOOLEAN,
					Constants.Z_ARGUMENT_REFERENCE
				].indexOf( this.zType ) !== -1;
			},
			zType: function () {
				return this.getZObjectTypeById( this.zobjectId );
			},
			zKeyLabel: function () {
				var label = this.getZkeyLabels[ this.zKey ];
				if ( label ) {
					return label + ':';
				}

				return;
			},
			zTypeLabel: function () {
				return this.getZkeyLabels[ this.zType ];
			},
			referenceValue: function () {
				return this.findKeyInArray(
					Constants.Z_REFERENCE_ID,
					this.getZObjectChildrenById( this.zobjectId ) )
					.value;
			},
			isIdentityKey: function () {
				return this.zType === Constants.Z_REFERENCE &&
					this.referenceValue === this.getCurrentZObjectId;
			},
			zTypeLink: function () {
				return '/wiki/' + this.zType;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys', 'changeType' ] ),
		{
			/**
			 * Sets the type of a ZObject key.
			 *
			 * @param {string} type
			 */
			onTypeChange: function ( type ) {
				var payload;
				if ( type ) {
					payload = {
						id: this.zobjectId,
						type: type
					};
					this.literalType = type;
					this.changeType( payload );
				}
			},
			onliteralChange: function ( type ) {
				this.literalType = type;
			},
			onModeChange: function ( mode ) {
				var selectedModeType = this.getTypeByMode( { selectedMode: mode, literalType: this.literalType } );

				this.selectedMode = mode;
				if ( selectedModeType !== this.zType ) {
					this.changeType( { id: this.zobjectId, type: selectedModeType } );
				}
			}
		} ),
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( './ZObject.vue' );
	},
	mounted: function () {
		// We set the current Literal to the current Ztype (if set),
		// this may be chjanged later when the zKeys are fetched.
		// This is needed for cases like Z2K2 to keep the String value
		this.literalType = this.zType;
	}
};
</script>

<style lang="less">
.ext-wikilambda-zobject-key {
	display: inline-block;
	vertical-align: top;
}

.ext-wikilambda-zobject-key > span {
	display: inline-block;
	vertical-align: top;
	margin-top: 5px;
}

.ext-wikilambda-zobject-key-inline {
	display: inline;
}
</style>
