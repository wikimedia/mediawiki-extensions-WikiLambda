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
			v-for="mode in modeList"
			:key="mode.key"
			:value="mode.key"
			:title="mode.label"
		>
			{{ mode.value }}
		</option>
	</select>
</template>

<script>
var Constants = require( '../Constants.js' ),
	validateMode = function ( selectedMode ) {
		var modeKeys = Object.keys( Constants.Z_KEY_MODES ),
			modeIdValid = false;

		modeKeys.forEach( function ( key ) {
			if ( Constants.Z_KEY_MODES[ key ] === selectedMode ) {
				modeIdValid = true;
			}
		} );

		return modeIdValid;
	};

module.exports = {
	name: 'ZKeyModeSelector',
	props: {
		mode: {
			type: String,
			required: true,
			validator: validateMode
		}
	},
	methods: {
		updateMode: function ( event ) {
			var modeKey = event.target.value;
			this.$emit( 'change', modeKey );
		}
	},
	computed: {
		modeList: function () {
			return [
				{ key: Constants.Z_KEY_MODES.REFERENCE, value: this.$i18n( 'wikilambda-modeselector-reference' ), label: this.$i18n( 'wikilambda-reference' ) },
				{ key: Constants.Z_KEY_MODES.LITERAL, value: this.$i18n( 'wikilambda-modeselector-literal' ), label: this.$i18n( 'wikilambda-literal' ) },
				{ key: Constants.Z_KEY_MODES.GENERIC_LITERAL, value: this.$i18n( 'wikilambda-modeselector-genericliteral' ), label: this.$i18n( 'wikilambda-genericliteral' ) },
				{ key: Constants.Z_KEY_MODES.FUNCTION_CALL, value: this.$i18n( 'wikilambda-modeselector-functioncall' ), label: this.$i18n( 'wikilambda-functioncall' ) }
			];
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zkey-modeselector {
	height: 24px;
}
</style>
