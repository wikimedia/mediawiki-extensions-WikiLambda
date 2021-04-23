<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zobject-key">
		<!-- zKey label -->
		<span>{{ zKeyLabel }} ({{ zKey }}):</span>

		<!-- If type isn't selected, show type selector -->
		<z-object-selector
			v-if="!zType"
			:viewmode="viewmode"
			:type="Constants.Z_TYPE"
			:placeholder="$i18n( 'wikilambda-typeselector-label' )"
			@input="onTypeChange"
		></z-object-selector>

		<!-- If there's a type, we render the appropriate component -->
		<template v-else>
			<span>{{ zTypeLabel }} ({{ zType }})</span>
			<z-key-mode-selector
				v-if="!viewmode"
				:mode="selectedMode"
				@change="onModeChange"
			></z-key-mode-selector>
			<z-object-generic
				v-if="selectedMode === Constants.Z_KEY_MODES.GENERIC_LITERAL"
				:zobject-id="zobjectId"
				:type="zType"
				:persistent="false"
				:viewmode="viewmode"
			></z-object-generic>
			<z-reference
				v-else-if="selectedMode === Constants.Z_KEY_MODES.REFERENCE"
				class="ext-wikilambda-zobject-key-inline"
				:zobject-id="zobjectId"
				:viewmode="viewmode"
				:search-type="literalType"
			></z-reference>
			<!-- Constants.Z_KEY_MODES.FUNCTION_CALL -->
			<!-- Constants.Z_KEY_MODES.LITERAL -->
			<z-object
				v-else
				:zobject-id="zobjectId"
				:viewmode="viewmode"
				:persistent="false"
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
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	name: 'ZObjectKey',
	components: {
		'z-object-selector': ZObjectSelector,
		'z-reference': ZReference,
		'z-key-mode-selector': ZKeyModeSelector,
		'z-object-generic': ZObjectGeneric
	},
	props: {
		viewmode: {
			type: Boolean,
			required: true
		},
		zKey: {
			type: String,
			required: true
		},
		zobjectId: {
			type: Number,
			required: true
		}
	},
	data: function () {
		return {
			Constants: Constants,
			selectedMode: Constants.Z_KEY_MODES.LITERAL
		};
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectTypeById',
			'getZkeyLiteralType',
			'getTypeByMode',
			'getZkeyLabels'
		] ),
		{
			zType: function () {
				return this.getZObjectTypeById( this.zobjectId );
			},
			zKeyLabel: function () {
				return this.getZkeyLabels[ this.zKey ];
			},
			zTypeLabel: function () {
				return this.getZkeyLabels[ this.zType ];
			},
			literalType: function () {
				return this.getZkeyLiteralType( this.zKey );
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
					this.changeType( payload );
				}
			},
			onModeChange: function ( mode ) {
				var selectedModeType = this.getTypeByMode( { selectedMode: mode, literalType: this.literalType } );
				this.selectedMode = mode;
				this.changeType( { id: this.zobjectId, type: selectedModeType } );
			}
		} ),
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( './ZObject.vue' );
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
	display: inline-block;
}
</style>
