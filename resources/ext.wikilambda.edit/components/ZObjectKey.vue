<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div :class="classZObjectKey">
		<!-- zKey label -->
		<label
			v-if="zKey"
			:id="'ext-wikilambda-zobject-key-label-' + zKey">
			{{ zKeyLabel }}
		</label>

		<!-- If type isn't selected, show type selector -->
		<wl-z-object-selector
			v-if="!zType"
			:aria-labelledby="'ext-wikilambda-zobject-key-label-' + zKey"
			:type="Constants.Z_TYPE"
			:return-type="Constants.Z_TYPE"
			:placeholder="$i18n( 'wikilambda-typeselector-label' ).text()"
			@input="onTypeChange"
		></wl-z-object-selector>

		<!-- If there's a type, we render the appropriate component -->
		<div
			v-else
			class="ext-wikilambda-zobject-key-value"
			:aria-labelledby="'ext-wikilambda-zobject-key-label-' + zKey">
			<!-- Check if zobject is actually a list  -->
			<span v-if="zType === Constants.Z_TYPED_LIST && zListType.key === '0'">
				{{ zTypeLabel }} &rarr;
				<wl-z-object
					:zobject-id="zListType.id"
					:persistent="false"
					:readonly="readonly"
					:reference-type="Constants.Z_TYPE"
				></wl-z-object>
			</span>
			<span v-else>
				<a :href="zTypeLink" :target="!viewmode ? '_self' : ''">{{ zTypeLabel }}</a>
			</span>

			<wl-z-key-mode-selector
				v-if="!( viewmode || readonly ) &&
					selectedMode && !isIdentityKey &&
					zType !== Constants.Z_OBJECT &&
					zType !== Constants.Z_TYPED_LIST"
				:mode="selectedMode"
				:parent-type="parentType"
				:literal-type="literalType"
				@change="onModeChange"
			></wl-z-key-mode-selector>
			<wl-z-object-generic
				v-if="selectedMode === Constants.Z_KEY_MODES.GENERIC_LITERAL"
				:zobject-id="zobjectId"
				:type="zType"
				:persistent="false"
				:readonly="readonly"
			></wl-z-object-generic>
			<wl-z-reference
				v-else-if="selectedMode === Constants.Z_KEY_MODES.REFERENCE"
				:zobject-id="zobjectId"
				:readonly="readonly"
				:search-type="literalType"
			></wl-z-reference>
			<wl-z-object-json
				v-else-if="selectedMode === Constants.Z_KEY_MODES.JSON"
				:zobject-id="zobjectId"
				:readonly="readonly"
				@change-literal="onliteralChange"
			></wl-z-object-json>
			<!-- Constants.Z_KEY_MODES.FUNCTION_CALL -->
			<!-- Constants.Z_KEY_MODES.LITERAL -->
			<wl-z-object
				v-else
				:zobject-id="zobjectId"
				:persistent="false"
				:parent-type="parentType"
				:readonly="readonly"
			></wl-z-object>
		</div>
	</div>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	ZKeyModeSelector = require( './ZKeyModeSelector.vue' ),
	ZReference = require( './main-types/ZReference.vue' ),
	ZObjectJson = require( './ZObjectJson.vue' ),
	ZObjectGeneric = require( './ZObjectGeneric.vue' ),
	mapState = require( 'vuex' ).mapState,
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-key',
	components: {
		'wl-z-object-selector': ZObjectSelector,
		'wl-z-reference': ZReference,
		'wl-z-key-mode-selector': ZKeyModeSelector,
		'wl-z-object-json': ZObjectJson,
		'wl-z-object-generic': ZObjectGeneric
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zKey: {
			type: String,
			default: ''
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
	computed: $.extend( {},
		mapState( [
			'zKeys'
		] ),
		mapGetters( [
			'getZObjectTypeById',
			'getListTypeById',
			'getZkeyLiteralType',
			'getTypeByMode',
			'getZkeyLabels',
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
				].includes( this.zType );
			},
			zType: function () {
				return this.getZObjectTypeById( this.zobjectId );
			},
			zListType: function () {
				if ( this.zType === Constants.Z_TYPED_LIST ) {
					return this.getListTypeById( this.zobjectId );
				}
				return { id: Constants.NEW_ZID_PLACEHOLDER };
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
				return new mw.Title( this.zType ).getUrl();
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'changeType', 'fetchZKeys' ] ),
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

				if ( selectedModeType !== this.zType ) {
					// If the mode selector generates a zobject content change, call changeType
					this.changeType( { id: this.zobjectId, type: selectedModeType } );
				} else {
					// Else, simply change the view without changing the content
					this.selectedMode = mode;
				}
			}
		} ),
	watch: {
		zType: {
			immediate: true,
			handler: function () {
				this.selectedMode = this.getModeByType( this.zType );
			}
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'wl-z-object' ] = require( './ZObject.vue' );
	},
	mounted: function () {
		if ( this.getZkeyLiteralType( this.zKey ) ) {
			this.literalType = this.getZkeyLiteralType( this.zKey );
		} else {
			this.fetchZKeys( { zids: [ Constants.Z_KEY ] } ).then( () => {
				this.literalType = this.getZkeyLiteralType( this.zKey );
			} );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zobject-key {
	display: inline-block;
	vertical-align: top;
	width: 100%;
}

.ext-wikilambda-zobject-key > span {
	display: inline-block;
	vertical-align: top;
	margin-top: 5px;
}

.ext-wikilambda-zobject-key-inline {
	display: inline;
}

.ext-wikilambda-zobject-key-value {
	display: inline;
}
</style>
