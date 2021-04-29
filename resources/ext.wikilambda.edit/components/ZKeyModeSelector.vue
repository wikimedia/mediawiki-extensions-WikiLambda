<template>
	<!--
		WikiLambda Vue interface module for Key mode selection.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<select
		class="ext-wikilambda-zkey-modeselector"
		:value="mode"
		@change="updateMode"
	>
		<option
			v-for="mode in availableModesWithCurrentType"
			:key="mode.key"
			:value="mode.key"
			:title="translate( mode.label )"
		>
			{{ translate( mode.value ) }}
		</option>
	</select>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	name: 'ZKeyModeSelector',
	props: {
		mode: {
			type: String,
			required: true,
			validator: this.modeIsValid
		},
		parentType: {
			type: String,
			required: true
		},
		literalType: {
			type: String,
			required: false,
			default: ''
		}
	},
	methods: {
		updateMode: function ( event ) {
			var modeValue = event.target.value;

			this.$emit( 'change', modeValue );
		},
		translate: function ( value ) {
			return this.$i18n( value );
		}
	},
	computed: $.extend( {},
		mapGetters( {
			getAllModes: 'getAllModes',
			modeIsValid: 'getModeIsValid'
		} ),
		{
			availableModesWithCurrentType: function () {
				var payload = {
					parentType: this.parentType,
					literalType: this.literalType
				};
				return this.getAllModes( payload );
			}
		}
	)
};
</script>

<style lang="less">
.ext-wikilambda-zkey-modeselector {
	height: 22px;
	vertical-align: top;
	margin-top: 5px;
}
</style>
