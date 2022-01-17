<template>
	<!--
		WikiLambda Vue component for boolean values

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div>
		<select
			v-if="!( viewmode || readonly )"
			v-model="currentBooleanValue"
			class="ext-wikilambda-zboolean"
		>
			<option value="" disabled>
				{{ $i18n( "wikilambda-editor-boolean-selector" ) }}
			</option>
			<option :value="Constants.Z_BOOLEAN_TRUE">
				{{ getZkeyLabels[ Constants.Z_BOOLEAN_TRUE ] }}
			</option>
			<option :value="Constants.Z_BOOLEAN_FALSE">
				{{ getZkeyLabels[ Constants.Z_BOOLEAN_FALSE ] }}
			</option>
		</select>
		<template v-else>
			{{ getZkeyLabels[ selectedBoolean.value ] }}
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = {
	name: 'ZBoolean',
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	computed: $.extend( mapGetters( {
		getZObjectChildrenById: 'getZObjectChildrenById',
		getZkeyLabels: 'getZkeyLabels'
	} ),
	{
		Constants: function () {
			return Constants;
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		selectedBoolean: function () {
			return this.findKeyInArray(
				[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
				this.getZObjectChildrenById(
					this.findKeyInArray(
						Constants.Z_BOOLEAN_IDENTITY, this.zobject
					).id
				)
			) || '';
		},
		selectedBooleanValue: function () {
			if ( this.selectedBoolean ) {
				return this.selectedBoolean.value;
			} else {
				return '';
			}
		},
		currentBooleanValue: {
			get: function () {
				return this.selectedBooleanValue;
			},
			set: function ( value ) {
				this.setZObjectValue( {
					id: this.selectedBoolean.id,
					value: value
				} );
			}
		}
	} ),
	methods: $.extend( mapActions( [
		'setZObjectValue',
		'fetchZKeys'
	] ),
	{

	} )
};
</script>

<style lang="less">
.ext-wikilambda-zboolean {
	display: inline-block;
	margin-top: 5px;
}
</style>
